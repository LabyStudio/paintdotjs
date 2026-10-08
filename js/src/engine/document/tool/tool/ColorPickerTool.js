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

class ColorPickerTool extends Tool {
    constructor(type) {
        super(type);
        this.tracking = false;
        this.button = MouseButton.LEFT;
        this.pixelPreview = null;
    }

    onActivate() {
        super.onActivate();
        this.pixelPreview = new BrushPreviewRenderer(this.getSurfaceBox());
        this.pixelPreview.setVisible(false);
        this.getSurfaceBox().addRenderer(this.pixelPreview);
        this.app.setCursorImg("color_picker_tool_sample_layer_cursor");
    }

    onDeactivate() {
        if (this.pixelPreview !== null) {
            this.getSurfaceBox().removeRenderer(this.pixelPreview);
            this.pixelPreview.dispose();
            this.pixelPreview = null;
        }
        this.tracking = false;
        super.onDeactivate();
    }

    updatePixelPreview(x, y) {
        if (this.pixelPreview === null) return;
        const point = new Point(Math.floor(x), Math.floor(y));
        const bounds = this.getActiveLayer().getBounds();
        if (!bounds.contains(point)) {
            this.pixelPreview.setVisible(false);
            return;
        }
        this.pixelPreview.setPreview(point, 1, "square", 1);
    }

    onMouseDown(x, y, button) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) return false;
        this.updatePixelPreview(x, y);
        this.tracking = true;
        this.button = button;
        return this.pickColor(x, y, button);
    }

    onMouseMove(x, y) {
        this.updatePixelPreview(x, y);
        if (!this.tracking) return true;
        return this.pickColor(x, y, this.button);
    }

    onMouseUp(x, y, button) {
        if (!this.tracking || button !== this.button) return false;
        this.pickColor(x, y, button);
        this.tracking = false;
        const afterClick = this.getSetting("afterClick", "none");
        if (afterClick === "pencil") {
            this.app.setActiveToolFromType(ToolType.PENCIL);
        } else if (afterClick === "previous") {
            const previous = this.app.getPreviousToolType();
            if (previous !== null && previous !== ToolType.COLOR_PICKER) {
                this.app.setActiveToolFromType(previous);
            }
        }
        return true;
    }

    pickColor(x, y, button) {
        const surface = (this.getSetting("sampleMode", "layer") === "image"
            || this.app.isControlKeyDown())
            ? this.getDocumentWorkspace().getCompositionSurface()
            : this.getActiveLayer().getSurface();
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return false;
        const sampleSize = Number(this.getSetting("sampleSize", 1));
        const radius = Math.floor(sampleSize / 2);
        const left = Math.max(0, x - radius);
        const top = Math.max(0, y - radius);
        const right = Math.min(surface.width, x + radius + 1);
        const bottom = Math.min(surface.height, y + radius + 1);
        const pixels = surface.context.getImageData(left, top, right - left, bottom - top).data;
        let premultipliedRed = 0, premultipliedGreen = 0;
        let premultipliedBlue = 0, alpha = 0;
        const count = pixels.length / 4;
        for (let i = 0; i < pixels.length; i += 4) {
            const pixelAlpha = pixels[i + 3];
            premultipliedRed += pixels[i] * pixelAlpha;
            premultipliedGreen += pixels[i + 1] * pixelAlpha;
            premultipliedBlue += pixels[i + 2] * pixelAlpha;
            alpha += pixelAlpha;
        }
        const unpremultiply = channel => alpha === 0 ? 0 : Math.round(channel / alpha);
        const color = new Color(
            unpremultiply(premultipliedRed), unpremultiply(premultipliedGreen),
            unpremultiply(premultipliedBlue), Math.round(alpha / count)
        );
        const colors = FormRegistry.get("colorsForm");
        if (colors !== null) {
            if (button === MouseButton.RIGHT) colors.setSecondaryColor(color, "picker");
            else colors.setMainColor(color, "picker");
        }
        return true;
    }
}
