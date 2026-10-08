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

class ImageUtil {

    static viewportScaleCaches = new WeakMap();

    /**
     * With antialiasing if the image is scaled down
     */
    static drawImage(context, image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        const downscaling = dWidth < sWidth || dHeight < sHeight;
        context.save();
        // Reduction needs filtering, while direct enlargement must preserve
        // the document pixels. Bilinear enlargement makes soft brushes look
        // progressively blurrier as the user zooms in.
        context.imageSmoothingEnabled = downscaling;
        context.imageSmoothingQuality = downscaling ? "high" : "low";
        context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        context.restore();
    }

    static drawViewportImage(
        context, image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, revision
    ) {
        const scaleX = dWidth / sWidth;
        const scaleY = dHeight / sHeight;
        const fractionalUpscaling = scaleX > 1 && scaleY > 1
            && (Math.abs(scaleX - Math.round(scaleX)) >= 1e-6
                || Math.abs(scaleY - Math.round(scaleY)) >= 1e-6);
        if (!fractionalUpscaling) {
            this.drawImage(context, image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            return;
        }

        // Paint.NET first enlarges to the next integer scale with nearest-
        // neighbor, then smoothly reduces that result to a fractional zoom.
        // Render only the visible source pixels so large documents and extreme
        // zoom levels do not require an enormous full-document intermediate.
        const transform = context.getTransform();
        const logicalWidth = context.canvas.width / Math.max(1e-6, Math.abs(transform.a));
        const logicalHeight = context.canvas.height / Math.max(1e-6, Math.abs(transform.d));
        const visibleLeft = Math.max(0, dx);
        const visibleTop = Math.max(0, dy);
        const visibleRight = Math.min(logicalWidth, dx + dWidth);
        const visibleBottom = Math.min(logicalHeight, dy + dHeight);
        if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
            return;
        }

        const sourceLeft = Math.max(sx,
            Math.floor(sx + (visibleLeft - dx) / scaleX) - 1);
        const sourceTop = Math.max(sy,
            Math.floor(sy + (visibleTop - dy) / scaleY) - 1);
        const sourceRight = Math.min(sx + sWidth,
            Math.ceil(sx + (visibleRight - dx) / scaleX) + 1);
        const sourceBottom = Math.min(sy + sHeight,
            Math.ceil(sy + (visibleBottom - dy) / scaleY) + 1);
        const sourceWidth = Math.max(1, sourceRight - sourceLeft);
        const sourceHeight = Math.max(1, sourceBottom - sourceTop);
        const integerScaleX = Math.ceil(scaleX);
        const integerScaleY = Math.ceil(scaleY);
        const intermediateWidth = sourceWidth * integerScaleX;
        const intermediateHeight = sourceHeight * integerScaleY;
        const cacheKey = [sourceLeft, sourceTop, sourceWidth, sourceHeight,
            integerScaleX, integerScaleY].join(":");

        let cache = this.viewportScaleCaches.get(image);
        if (cache === undefined) {
            cache = {canvas: document.createElement("canvas"), key: null, revision: -1};
            this.viewportScaleCaches.set(image, cache);
        }
        if (cache.key !== cacheKey || cache.revision !== revision) {
            if (cache.canvas.width !== intermediateWidth) {
                cache.canvas.width = intermediateWidth;
            }
            if (cache.canvas.height !== intermediateHeight) {
                cache.canvas.height = intermediateHeight;
            }
            const intermediateContext = cache.canvas.getContext("2d", {alpha: true});
            intermediateContext.clearRect(0, 0, intermediateWidth, intermediateHeight);
            intermediateContext.imageSmoothingEnabled = false;
            intermediateContext.drawImage(
                image,
                sourceLeft, sourceTop, sourceWidth, sourceHeight,
                0, 0, intermediateWidth, intermediateHeight
            );
            cache.key = cacheKey;
            cache.revision = revision;
        }

        context.save();
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
            cache.canvas,
            0, 0, intermediateWidth, intermediateHeight,
            dx + (sourceLeft - sx) * scaleX,
            dy + (sourceTop - sy) * scaleY,
            sourceWidth * scaleX,
            sourceHeight * scaleY
        );
        context.restore();
    }

    static createTransparentPattern(context, size, brightness = 1) {
        let patternCanvas = document.createElement('canvas');
        patternCanvas.width = size * 2;
        patternCanvas.height = size * 2;

        // Render pattern
        let patternContext = patternCanvas.getContext('2d');
        const light = Math.round(255 * brightness);
        const dark = Math.round(191 * brightness);
        patternContext.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
        patternContext.fillRect(0, 0, size, size);
        patternContext.fillRect(size, size, size, size);

        patternContext.fillStyle = `rgb(${light}, ${light}, ${light})`;
        patternContext.fillRect(size, 0, size, size);
        patternContext.fillRect(0, size, size, size);

        return context.createPattern(patternCanvas, 'repeat');
    }

    static createDirtyStar(size = 32) {
        const scale = size / 32;

        const color = "#FFA500";
        const thickness = 3 * scale;

        const outlineColor = "#FFFFFF";
        const outlineThickness = 8 * scale;

        let amount = 8;

        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        let ctx = canvas.getContext("2d");
        ctx.save();
        ctx.imageSmoothingEnabled = true;

        const left = 0;
        const top = 0;
        const right = canvas.width;
        const bottom = canvas.height;

        const radius = Math.min((right - left) / 2.0, (bottom - top) / 2.0);
        const centerPoint = {
            x: (left + right) / 2.0,
            y: (top + bottom) / 2.0
        };

        // Calculate points for a star shape
        const lines = [];
        for (let i = 0; i < amount; i++) {
            const rotation = i * 2 * Math.PI / amount;
            const x = centerPoint.x + radius * Math.sin(rotation);
            const y = centerPoint.y + radius * Math.cos(rotation);
            lines.push(centerPoint);
            lines.push({
                x: x,
                y: y
            });
        }

        // Draw lines with outer pen
        ctx.lineWidth = outlineThickness;
        ctx.strokeStyle = outlineColor;
        for (let i = 0; i < lines.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(lines[i].x, lines[i].y);
            ctx.lineTo(lines[i + 1].x, lines[i + 1].y);
            ctx.stroke();
        }

        // Draw lines with inner pen
        ctx.lineWidth = thickness;
        ctx.strokeStyle = color;
        for (let i = 0; i < lines.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(lines[i].x, lines[i].y);
            ctx.lineTo(lines[i + 1].x, lines[i + 1].y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw white dot in middle
        ctx.fillStyle = outlineColor;
        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, 3 * scale, 0, 2 * Math.PI);
        ctx.fill();

        return canvas.toDataURL();
    }

}
