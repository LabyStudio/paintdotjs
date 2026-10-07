class CloneStampTool extends DrawingTool {
    static anchors = new WeakMap();

    constructor(type) {
        // Clone Stamp is a sampled brush: its source pixels are rendered
        // through the same hardness/spacing mask as the Paintbrush.
        super(type, 20, false, true);
        this.destinationStart = null;
        this.sourceOffset = null;
        this.strokeSourceSurface = null;
        this.cloneMaskSurface = null;
        this.destinationPreview = null;
        this.sourcePreview = null;
        this.previewPoint = null;
        this.previewPressure = 1;
        this.settingAnchor = false;
        this.missingAnchorDialogOpen = false;
    }

    usesContinuousPointerCoordinates() {
        return true;
    }

    onActivate() {
        super.onActivate();
        this.sourcePreview = new BrushPreviewRenderer(this.getSurfaceBox());
        this.destinationPreview = new BrushPreviewRenderer(this.getSurfaceBox());
        this.sourcePreview.setVisible(false);
        this.destinationPreview.setVisible(false);
        this.getSurfaceBox().addRenderer(this.sourcePreview);
        this.getSurfaceBox().addRenderer(this.destinationPreview);
        this.updateCursor();
        this.updateSourcePreview();
    }

    onDeactivate() {
        this.disposeStrokeSource();
        this.destroyPreviews();
        super.onDeactivate();
    }

    getAnchor() {
        const anchor = CloneStampTool.anchors.get(this.getDocumentWorkspace()) || null;
        // Anchors created by older tool instances were absolute points.
        if (anchor !== null && anchor.mode === undefined) {
            anchor.mode = "absolute";
            anchor.offset = null;
        }
        return anchor;
    }

    onMouseDown(x, y, button, input = null) {
        this.updatePreviews(x, y, input);
        if (this.app.isControlKeyDown()) {
            this.settingAnchor = true;
            CloneStampTool.anchors.set(this.getDocumentWorkspace(), {
                mode: "absolute",
                point: new Point(x, y),
                offset: null,
                layerIndex: this.getActiveLayerIndex()
            });
            this.sourceOffset = null;
            this.updateCursor();
            this.updateSourcePreview();
            return true;
        }
        const anchor = this.getAnchor();
        if (anchor === null) {
            this.showMissingAnchorWarning();
            return true;
        }
        const layers = this.getDocumentWorkspace().getDocument().getLayers();
        if (anchor.layerIndex < 0 || anchor.layerIndex >= layers.size()) {
            CloneStampTool.anchors.delete(this.getDocumentWorkspace());
            this.updateSourcePreview();
            this.showMissingAnchorWarning();
            return true;
        }

        // Paint.NET changes the initially fixed source point into an aligned
        // offset when the first destination stroke begins. Both the sampled
        // source and its reference circle then follow the destination pointer.
        if (anchor.mode === "absolute") {
            anchor.mode = "relative";
            anchor.offset = new Point(anchor.point.x - x, anchor.point.y - y);
        }
        this.sourceOffset = anchor.offset.clone();
        anchor.point = new Point(x + this.sourceOffset.x, y + this.sourceOffset.y);
        this.disposeStrokeSource();
        this.strokeSourceSurface = layers.getAt(anchor.layerIndex).getSurface().clone();
        this.disposeCloneMask();
        this.cloneMaskSurface = Surface.create(
            this.strokeSourceSurface.width, this.strokeSourceSurface.height);
        this.destinationStart = new Point(x, y);
        this.updateSourcePreview();
        return super.onMouseDown(x, y, button, input);
    }

    onMouseMove(x, y, input = null) {
        if (this.settingAnchor) {
            const anchor = this.getAnchor();
            anchor.point = new Point(x, y);
            anchor.layerIndex = this.getActiveLayerIndex();
        }
        this.updatePreviews(x, y, input);
        if (this.settingAnchor) return true;
        return super.onMouseMove(x, y, input);
    }

    onMouseUp(x, y, button, input = null) {
        if (this.settingAnchor) {
            this.settingAnchor = false;
            const anchor = this.getAnchor();
            anchor.point = new Point(x, y);
            this.updatePreviews(x, y, input);
            return true;
        }
        const result = super.onMouseUp(x, y, button, input);
        this.disposeStrokeSource();
        this.updatePreviews(x, y, input);
        return result;
    }

    onSettingChanged() {
        if (this.previewPoint !== null) {
            this.updatePreviews(this.previewPoint.x, this.previewPoint.y,
                {pressure: this.previewPressure});
        } else {
            this.updateSourcePreview();
        }
    }

    showMissingAnchorWarning() {
        if (this.missingAnchorDialogOpen) return;
        this.missingAnchorDialogOpen = true;
        void TaskDialog.show({
            title: "paint.js",
            className: "clone-stamp-warning-dialog",
            message: "Could not use the Clone Stamp because the area to clone has not been set.\n\nUse Ctrl+Click to set the anchor point.",
            cancelValue: true,
            choices: [{value: true, title: "OK"}]
        }).finally(() => {
            this.missingAnchorDialogOpen = false;
        });
    }

    updateCursor() {
        this.app.setCursorImg(this.app.isControlKeyDown() || this.getAnchor() === null
            ? "clone_stamp_tool_set_source_cursor"
            : "clone_stamp_tool_cursor");
    }

    updatePreviews(x, y, input = null) {
        if (this.destinationPreview === null) return;
        const point = new Point(x, y);
        this.previewPoint = point;
        this.previewPressure = input && Number.isFinite(Number(input.pressure))
            ? Number(input.pressure) : 1;
        const bounds = this.getActiveLayer().getBounds();
        if (bounds.contains(point)) {
            const pressure = this.tracking && this.getSetting("pressure", false)
                ? Utility.clamp(this.previewPressure, 0.05, 1) : 1;
            this.destinationPreview.setPreview(point, this.getWidth() * pressure,
                "circle", 1, false);
        } else {
            this.destinationPreview.setVisible(false);
        }

        const anchor = this.getAnchor();
        if (anchor !== null && anchor.mode === "relative") {
            anchor.point = new Point(point.x + anchor.offset.x, point.y + anchor.offset.y);
        }
        this.updateCursor();
        this.updateSourcePreview();
    }

    updateSourcePreview() {
        if (this.sourcePreview === null) return;
        const anchor = this.getAnchor();
        if (anchor === null || !this.getActiveLayer().getBounds().contains(anchor.point)) {
            this.sourcePreview.setVisible(false);
            return;
        }
        // Paint.NET renders the source handle with the unpressurized brush size
        // and a softer, pulsing outline. A lower-opacity outline distinguishes
        // it from the destination circle while keeping it visible on any color.
        this.sourcePreview.setPreview(anchor.point, this.getWidth(), "circle", 0.65, false);
    }

    destroyPreviews() {
        if (this.sourcePreview !== null) {
            this.getSurfaceBox().removeRenderer(this.sourcePreview);
            this.sourcePreview.dispose();
            this.sourcePreview = null;
        }
        if (this.destinationPreview !== null) {
            this.getSurfaceBox().removeRenderer(this.destinationPreview);
            this.destinationPreview.dispose();
            this.destinationPreview = null;
        }
        this.previewPoint = null;
        this.settingAnchor = false;
    }

    disposeStrokeSource() {
        if (this.strokeSourceSurface !== null) this.strokeSourceSurface.dispose();
        this.strokeSourceSurface = null;
    }

    disposeCloneMask() {
        if (this.cloneMaskSurface !== null) this.cloneMaskSurface.dispose();
        this.cloneMaskSurface = null;
    }

    commitStroke() {
        super.commitStroke();
        this.disposeCloneMask();
    }

    drawSegment(from, to, fromPressure = 1, toPressure = fromPressure) {
        const surface = this.getActiveLayer().getSurface();
        const width = this.getWidth();
        const antialiased = this.getSetting("antialias", true);
        const hardness = antialiased
            ? Utility.clamp(Number(this.getSetting("hardness", 100)), 0, 100) / 100
            : 1;
        const maxStampWidth = width * Math.max(fromPressure, toPressure);
        const stampExtent = this.getBrushStampExtent(maxStampWidth, hardness);
        const segmentLength = Utility.distance(from, to);
        const spacing = Math.max(1, width * Number(this.getSetting("spacing", 15)) / 100);
        const distance = Math.max(1, Math.ceil(segmentLength / spacing));
        const bounds = Rectangle.absolute(
            Math.min(from.x, to.x), Math.min(from.y, to.y),
            Math.max(from.x, to.x) + 1, Math.max(from.y, to.y) + 1
        );
        bounds.inflate(Math.ceil(stampExtent) + 1, Math.ceil(stampExtent) + 1);

        const maskContext = this.cloneMaskSurface.context;
        const maskColor = new Color(255, 255, 255, 255);
        maskContext.save();
        maskContext.globalCompositeOperation = "source-over";
        for (let i = 0; i <= distance; ++i) {
            const t = i / distance;
            const dx = from.x + (to.x - from.x) * t;
            const dy = from.y + (to.y - from.y) * t;
            const stampWidth = width * (fromPressure + (toPressure - fromPressure) * t);
            if (antialiased) {
                this.drawBrushStamp(maskContext, dx, dy, width, stampWidth,
                    hardness, maskColor);
            } else {
                maskContext.fillStyle = "white";
                this.drawAliasedBrushStamp(maskContext, dx, dy, stampWidth);
            }
        }
        maskContext.restore();

        const dirtyBounds = Rectangle.intersect(
            Utility.roundRectangle(bounds), surface.getBounds());
        if (dirtyBounds.isEmpty()) return;

        // Rebuild the cloned content for this part of the stroke from the
        // immutable mouse-down snapshot, then apply the accumulated brush mask.
        // Drawing the source once avoids dark seams where soft dabs overlap.
        const context = this.strokeSurface.context;
        context.clearRect(dirtyBounds.x, dirtyBounds.y,
            dirtyBounds.width, dirtyBounds.height);
        context.save();
        context.beginPath();
        context.rect(dirtyBounds.x, dirtyBounds.y,
            dirtyBounds.width, dirtyBounds.height);
        context.clip();
        // The handles and brush path remain continuous, while Paint.NET floors
        // only the bitmap sampling offset so cloned pixels stay sharp.
        const offsetX = Math.floor(-this.sourceOffset.x);
        const offsetY = Math.floor(-this.sourceOffset.y);
        context.drawImage(this.strokeSourceSurface.canvas, offsetX, offsetY);
        context.globalCompositeOperation = "destination-in";
        context.drawImage(this.cloneMaskSurface.canvas, 0, 0);
        context.restore();
        this.changedBounds = Rectangle.union(this.changedBounds, bounds);
        this.markBitmapTransactionDirty(this.changedBounds);
        this.pendingStrokeBounds = this.pendingStrokeBounds === null
            ? dirtyBounds
            : Rectangle.union(this.pendingStrokeBounds, dirtyBounds);
    }
}
