/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class Surface {

    constructor(canvas, options = {}) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Expected an HTMLCanvasElement");
        }

        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        // Normal document surfaces stay GPU-oriented because editing is dominated
        // by drawImage, compositing, and transforms. Dedicated readback surfaces
        // may opt into a software backing store without slowing every layer.
        this.context = canvas.getContext('2d', {
            alpha: true,
            willReadFrequently: options.willReadFrequently === true
        });
        this.context.imageSmoothingEnabled = false;

        this.checkerboard = null;
        this.checkerboardBrightness = null;
    }

    clear(color = null) {
        this.clearRegion(0, 0, this.width, this.height, color);
    }

    clearRegion(x, y, width, height, color = null) {
        this.context.clearRect(x, y, width, height);

        if (color !== null) {
            this.context.fillStyle = color.toHex();
            this.context.fillRect(x, y, width, height);
        }
    }

    render(renderArgs, rectangle, opacity = 1, blendMode = null) {
        // Render surface to renderArgs.surface
        let targetSurface = renderArgs.getSurface();
        const targetContext = targetSurface.context;

        if (blendMode !== null && blendMode.canvasOperation === null) {
            this.renderCustomBlend(targetContext, rectangle, opacity, blendMode.value);
            return;
        }

        targetContext.save();
        targetContext.beginPath();
        targetContext.rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        targetContext.clip();
        targetContext.globalAlpha = opacity;
        targetContext.globalCompositeOperation = blendMode === null
            ? "source-over"
            : blendMode.canvasOperation;
        targetContext.imageSmoothingEnabled = false;
        // Cropping both the source and destination makes the browser sample
        // the transparent pixels just outside every dirty rectangle. At high
        // zoom that becomes the checkerboard box around every brush update.
        // Clip only the destination and sample the full layer instead.
        targetContext.drawImage(this.canvas, 0, 0);
        targetContext.restore();
    }

    renderCustomBlend(targetContext, rectangle, opacity, blendMode) {
        const bounds = Rectangle.intersect(rectangle, this.getBounds());
        if (bounds.isEmpty()) return;

        const source = this.context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
        const target = targetContext.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
        const sourceData = source.data;
        const targetData = target.data;

        for (let offset = 0; offset < sourceData.length; offset += 4) {
            const sourceAlpha = sourceData[offset + 3] / 255 * opacity;
            if (sourceAlpha <= 0) continue;

            const backdropAlpha = targetData[offset + 3] / 255;
            const outputAlpha = sourceAlpha + backdropAlpha * (1 - sourceAlpha);

            for (let channel = 0; channel < 3; ++channel) {
                const backdrop = targetData[offset + channel];
                const foreground = sourceData[offset + channel];
                const blended = this.blendLayerChannel(backdrop, foreground, blendMode);
                const premultiplied = sourceAlpha * (1 - backdropAlpha) * foreground
                    + sourceAlpha * backdropAlpha * blended
                    + (1 - sourceAlpha) * backdropAlpha * backdrop;
                targetData[offset + channel] = outputAlpha === 0 ? 0 : premultiplied / outputAlpha;
            }
            targetData[offset + 3] = outputAlpha * 255;
        }

        targetContext.putImageData(target, bounds.x, bounds.y);
    }

    blendLayerChannel(backdrop, foreground, blendMode) {
        switch (blendMode) {
            case "reflect":
                return foreground === 255
                    ? 255
                    : Math.min(255, backdrop * backdrop / (255 - foreground));
            case "glow":
                return backdrop === 255
                    ? 255
                    : Math.min(255, foreground * foreground / (255 - backdrop));
            case "negation":
                return 255 - Math.abs(255 - backdrop - foreground);
            case "xor":
                return backdrop ^ foreground;
            default:
                return foreground;
        }
    }

    clone() {
        let surface = Surface.create(this.width, this.height);
        surface.context.drawImage(this.canvas, 0, 0);
        return surface;
    }

    renderCheckerboard(x, y, width, height) {
        const brightness = typeof AppSettingsStore === "undefined"
            ? 0.75
            : AppSettingsStore.get("canvas.checkerboardBrightness", 75) / 100;
        if (this.checkerboard === null || brightness !== this.checkerboardBrightness) {
            this.checkerboard = ImageUtil.createTransparentPattern(this.context, 5, brightness);
            this.checkerboardBrightness = brightness;
        }

        this.context.fillStyle = this.checkerboard;
        this.context.fillRect(x, y, width, height);
    }

    copySurfaceRectangle(source, sourceRoi) {
        if (this.canvas === null || source.canvas === null) {
            throw new Error("Cannot copy surface: one of the surfaces is disposed.");
        }

        sourceRoi.intersect(source.getBounds());
        let copiedWidth = Math.min(this.width, sourceRoi.width);
        let copiedHeight = Math.min(this.height, sourceRoi.height);

        if (copiedWidth === 0 || copiedHeight === 0) {
            return;
        }

        let src = source.createWindowFromRectangle(sourceRoi);
        this.copySurface(src);
    }

    copySurface(source) {
        if (this.canvas === null || source.canvas === null) {
            throw new Error("Cannot copy surface: one of the surfaces is disposed.");
        }

        this.context.save();
        this.context.globalCompositeOperation = "copy";
        this.context.drawImage(
            source.canvas,
            0, 0, source.width, source.height,
            0, 0, this.width, this.height
        );
        this.context.restore();
    }

    copyRegionFrom(source, rectangle) {
        if (this.canvas === null || source.canvas === null) {
            throw new Error("Cannot copy surface: one of the surfaces is disposed.");
        }

        // Canvas bitmap copies must use integer pixel bounds. Fractional ROIs
        // make drawImage sample across transparent neighbours, which leaves
        // translucent seams when a transformed preview is repeatedly restored.
        let clipped = Rectangle.intersect(Utility.roundRectangle(rectangle), this.getBounds());
        clipped.intersect(source.getBounds());
        if (clipped.width <= 0 || clipped.height <= 0) {
            return;
        }

        // `copy` compositing is unsafe for partial updates: browsers may clear
        // destination pixels outside the source shape. Clear only this ROI so
        // transparent source pixels are copied correctly, then redraw it using
        // normal source-over compositing.
        this.context.clearRect(clipped.x, clipped.y, clipped.width, clipped.height);
        this.context.save();
        this.context.globalCompositeOperation = "source-over";
        this.context.globalAlpha = 1;
        this.context.imageSmoothingEnabled = false;
        this.context.drawImage(
            source.canvas,
            clipped.x, clipped.y, clipped.width, clipped.height,
            clipped.x, clipped.y, clipped.width, clipped.height
        );
        this.context.restore();
    }

    copyRegionFromExact(source, rectangle) {
        if (this.canvas === null || source.canvas === null) {
            throw new Error("Cannot copy surface: one of the surfaces is disposed.");
        }

        let clipped = Rectangle.intersect(Utility.roundRectangle(rectangle), this.getBounds());
        clipped.intersect(source.getBounds());
        if (clipped.width <= 0 || clipped.height <= 0) return;

        // Brush restoration must be pixel-exact. A clipped drawImage can leave
        // an antialiased edge at the clip boundary, which becomes a visible
        // rectangle after the composition surface is scaled for display.
        // This transfer now runs only once per frame for the latest dirty area,
        // rather than once per pointer sample for every saved stroke tile.
        const pixels = source.context.getImageData(
            clipped.x, clipped.y, clipped.width, clipped.height
        );
        this.context.putImageData(pixels, clipped.x, clipped.y);
    }

    createWindowFromRectangle(rectangle) {
        return this.createWindow(
            rectangle.x, rectangle.y,
            rectangle.width, rectangle.height
        );
    }

    createWindow(x, y, windowWidth, windowHeight) {
        if (this.canvas === null) {
            throw new Error("Cannot create window: surface is disposed.");
        }

        if (windowHeight <= 0) {
            throw new Error("windowHeight must be greater than zero");
        }

        let original = this.getBounds();
        let sub = new Rectangle(x, y, windowWidth, windowHeight);
        let clipped = Rectangle.intersect(original, sub);

        if (clipped === null || clipped.width <= 0 || clipped.height <= 0) {
            throw new Error(`bounds parameters must be a subset of this Surface's bounds: ${JSON.stringify(sub)}`);
        }

        let surface = Surface.create(windowWidth, windowHeight);
        // "Copy memory block" equivalent in canvas context
        surface.context.drawImage(
            this.canvas,
            clipped.x, clipped.y, clipped.width, clipped.height,
            0, 0, windowWidth, windowHeight
        );
        return surface;
    }

    getColorAt(x, y) {
        if (x < 0 || x >= this.width) {
            throw new Error(`x=${x} is out of bounds of [0, ${this.width})`);
        }

        if (y < 0 || y >= this.height) {
            throw new Error(`y=${y} is out of bounds of [0, ${this.height})`);
        }

        let data = this.context.getImageData(x, y, 1, 1).data;
        return new Color(data[0], data[1], data[2], data[3]);
    }

    setColorAt(x, y, color) {
        if (x < 0 || x >= this.width) {
            throw new Error(`x=${x} is out of bounds of [0, ${this.width})`);
        }

        if (y < 0 || y >= this.height) {
            throw new Error(`y=${y} is out of bounds of [0, ${this.height})`);
        }

        let imageData = this.context.getImageData(x, y, 1, 1);
        imageData.data[0] = color.r;
        imageData.data[1] = color.g;
        imageData.data[2] = color.b;
        imageData.data[3] = color.a;
        this.context.putImageData(imageData, x, y);
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.context;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    setWidth(width) {
        this.width = width;
        this.canvas.width = width;
        this.context.imageSmoothingEnabled = false;
    }

    setHeight(height) {
        this.height = height;
        this.canvas.height = height;
        this.context.imageSmoothingEnabled = false;
    }

    getBounds() {
        return new Rectangle(0, 0, this.width, this.height);
    }

    dispose() {
        this.canvas = null;
        this.context = null;
        this.checkerboard = null;
    }

    static fromCanvas(canvas) {
        return new Surface(canvas);
    }

    static create(width, height, options = {}) {
        let canvas = document.createElement('canvas');
        let surface = new Surface(canvas, options);
        surface.setWidth(width);
        surface.setHeight(height);
        return surface;
    }
}
