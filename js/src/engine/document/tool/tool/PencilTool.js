class PencilTool extends DrawingTool {
    constructor(type) {
        super(type, 1, false);
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("pencil_tool_cursor");
    }

    drawSegment(from, to) {
        const surface = this.getActiveLayer().getSurface();
        const context = surface.context;
        const segmentBounds = Rectangle.absolute(
            Math.min(from.x, to.x), Math.min(from.y, to.y),
            Math.max(from.x, to.x) + 1, Math.max(from.y, to.y) + 1
        );
        this.saveRegion(null, segmentBounds);
        context.save();
        this.clipToSelection(context);
        context.fillStyle = this.getColor(this.button).toHex();
        let x0 = Math.round(from.x), y0 = Math.round(from.y);
        const x1 = Math.round(to.x), y1 = Math.round(to.y);
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let error = dx + dy;
        while (true) {
            context.fillRect(x0, y0, 1, 1);
            if (x0 === x1 && y0 === y1) break;
            const doubled = error * 2;
            if (doubled >= dy) { error += dy; x0 += sx; }
            if (doubled <= dx) { error += dx; y0 += sy; }
        }
        context.restore();

        this.changedBounds = Rectangle.union(this.changedBounds, segmentBounds);
        this.markBitmapTransactionDirty(this.changedBounds);
        this.getActiveLayer().invalidate(Rectangle.intersect(segmentBounds, surface.getBounds()));
    }
}
