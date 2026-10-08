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

class PaintBrushTool extends DrawingTool {
    constructor(type) {
        super(type, 10, false, true);
        this.brushPreview = null;
        this.previewPoint = null;
        this.previewPressure = 1;
    }

    onActivate() {
        super.onActivate();
        this.brushPreview = new BrushPreviewRenderer(this.getSurfaceBox());
        this.brushPreview.setVisible(false);
        this.getSurfaceBox().addRenderer(this.brushPreview);
        this.app.setCursorImg("paint_brush_tool_cursor");
    }

    onDeactivate() {
        this.destroyBrushPreview();
        super.onDeactivate();
    }

    onMouseDown(x, y, button, input = null) {
        this.updateBrushPreview(x, y, input, true);
        const handled = super.onMouseDown(x, y, button, input);
        if (handled) {
            this.app.setCursor("none");
            this.updateBrushPreview(x, y, input, true);
        }
        return handled;
    }

    onMouseMove(x, y, input = null) {
        this.updateBrushPreview(x, y, input, this.tracking);
        return super.onMouseMove(x, y, input);
    }

    onMouseUp(x, y, button, input = null) {
        const handled = super.onMouseUp(x, y, button, input);
        if (handled) {
            this.app.setCursorImg("paint_brush_tool_cursor");
            this.updateBrushPreview(x, y, input, false);
        }
        return handled;
    }

    onSettingChanged() {
        if (this.previewPoint !== null) {
            this.updateBrushPreview(this.previewPoint.x, this.previewPoint.y,
                {pressure: this.previewPressure}, this.tracking);
        }
    }

    updateBrushPreview(x, y, input, pressed) {
        if (this.brushPreview === null) {
            return;
        }
        const point = new Point(x, y);
        const bounds = this.getActiveLayer().getBounds();
        if (!bounds.contains(point)) {
            this.brushPreview.setVisible(false);
            return;
        }
        this.previewPoint = point;
        this.previewPressure = input && Number.isFinite(Number(input.pressure))
            ? Number(input.pressure) : 1;
        const pressure = pressed && this.getSetting("pressure", false)
            ? Utility.clamp(this.previewPressure, 0.05, 1) : 1;
        this.brushPreview.setPreview(
            point,
            this.getWidth() * pressure,
            "circle",
            pressed ? 0.5 : 1,
            false
        );
    }

    destroyBrushPreview() {
        if (this.brushPreview === null) {
            return;
        }
        this.getSurfaceBox().removeRenderer(this.brushPreview);
        this.brushPreview.dispose();
        this.brushPreview = null;
        this.previewPoint = null;
    }
}
