class CloneStampTool extends DrawingTool {
    static anchors = new WeakMap();

    constructor(type) {
        super(type, 20, false);
        this.destinationStart = null;
        this.strokeSourceSurface = null;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg(this.getAnchor() === null ? "clone_stamp_tool_set_source_cursor" : "clone_stamp_tool_cursor");
    }

    onDeactivate() {
        this.disposeStrokeSource();
        super.onDeactivate();
    }

    getAnchor() {
        return CloneStampTool.anchors.get(this.getDocumentWorkspace()) || null;
    }

    onMouseDown(x, y, button, input = null) {
        if (this.app.isControlKeyDown()) {
            CloneStampTool.anchors.set(this.getDocumentWorkspace(), {
                point: new Point(x, y),
                layerIndex: this.getActiveLayerIndex()
            });
            this.app.setCursorImg("clone_stamp_tool_cursor");
            return true;
        }
        const anchor = this.getAnchor();
        if (anchor === null) return true;
        const layers = this.getDocumentWorkspace().getDocument().getLayers();
        if (anchor.layerIndex < 0 || anchor.layerIndex >= layers.size()) return true;
        this.disposeStrokeSource();
        this.strokeSourceSurface = layers.getAt(anchor.layerIndex).getSurface().clone();
        this.destinationStart = new Point(x, y);
        return super.onMouseDown(x, y, button, input);
    }

    onMouseUp(x, y, button, input = null) {
        const result = super.onMouseUp(x, y, button, input);
        this.disposeStrokeSource();
        return result;
    }

    disposeStrokeSource() {
        if (this.strokeSourceSurface !== null) this.strokeSourceSurface.dispose();
        this.strokeSourceSurface = null;
    }

    drawSegment(from, to, fromPressure = 1, toPressure = fromPressure) {
        const surface = this.getActiveLayer().getSurface();
        const context = surface.context;
        const width = this.getWidth();
        const segmentLength = Utility.distance(from, to);
        const spacing = Math.max(0.5, width * Number(this.getSetting("spacing", 15)) / 100);
        const distance = Math.max(1, Math.ceil(segmentLength / spacing));
        const bounds = Rectangle.absolute(
            Math.min(from.x, to.x), Math.min(from.y, to.y),
            Math.max(from.x, to.x) + 1, Math.max(from.y, to.y) + 1
        );
        bounds.inflate(width / 2 + 1, width / 2 + 1);
        this.saveRegion(null, bounds);
        context.save();
        this.clipToSelection(context);
        context.globalCompositeOperation = this.getCompositeOperation();
        context.beginPath();
        for (let i = 0; i <= distance; ++i) {
            const t = i / distance;
            const dx = from.x + (to.x - from.x) * t;
            const dy = from.y + (to.y - from.y) * t;
            const stampWidth = width * (fromPressure + (toPressure - fromPressure) * t);
            const radius = stampWidth / 2;
            if (this.getSetting("brushType", "circle") === "square") {
                context.rect(dx - radius, dy - radius, stampWidth, stampWidth);
            } else {
                context.moveTo(dx + radius, dy);
                context.arc(dx, dy, radius, 0, Math.PI * 2);
            }
        }
        context.clip();
        const anchor = this.getAnchor();
        const offsetX = this.destinationStart.x - anchor.point.x;
        const offsetY = this.destinationStart.y - anchor.point.y;
        context.drawImage(this.strokeSourceSurface.canvas, offsetX, offsetY);
        context.restore();
        this.changedBounds = Rectangle.union(this.changedBounds, bounds);
        this.markBitmapTransactionDirty(this.changedBounds);
        this.getActiveLayer().invalidate(Rectangle.intersect(bounds, surface.getBounds()));
    }
}
