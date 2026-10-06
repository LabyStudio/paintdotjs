class MoveTool extends MoveToolBase {

    constructor(type) {
        super(type);

        this.context = new MoveToolContext();
        this.enableOutline = false;

        this.fullQuality = false;
        this.activeLayer = null;
        this.renderArgs = null;
        this.didPaste = false;
        this.pendingMoveFrame = null;
        this.pendingMovePoint = null;
        this.processingMoveFrame = false;
    }

    onActivate() {
        // TODO find the texture for the move tool cursor
        // this.app.setCursorImg("move_tool_cursor");

        this.context.lifted = false;
        this.context.liftedPixels = null;
        this.context.offset = new Point(0, 0);
        this.context.liftedBounds = this.getSelection().getBounds();
        this.activeLayer = this.getActiveLayer();

        if (this.renderArgs !== null) {
            this.renderArgs.dispose();
            this.renderArgs = null;
        }

        if (this.activeLayer === null) {
            this.renderArgs = null;
        } else {
            this.renderArgs = new RenderArgs(this.getActiveLayer().getSurface())
        }

        this.tracking = false;
        this.positionNubs(this.context.currentMode);

        this.fullQuality = false;

        super.onActivate();
    }

    onDeactivate() {
        this.cancelPendingMove();

        if (this.context.lifted) {
            this.drop();
        }

        this.activeLayer = null;

        if (this.renderArgs !== null) {
            this.renderArgs.dispose();
            this.renderArgs = null;
        }

        this.tracking = false;
        this.destroyNubs();

        super.onDeactivate();
    }

    drop() {
        this.restorePreview();

        let regionCopy = this.getSelection().createRegion();
        let simplifiedRegion = Utility.simplifyAndInflateRegion(regionCopy, Utility.defaultSimplificationFactor, 2);
        let bitmapAction2 = new BitmapHistoryMemento(
            this.getName(),
            this.getImage(),
            this.getDocumentWorkspace(),
            this.getActiveLayerIndex(),
            simplifiedRegion
        );

        let oldHQ = this.fullQuality;
        this.fullQuality = true;
        this.renderInternal(this.context.offset, true, false);
        this.fullQuality = oldHQ;
        this.currentHistoryMementos.push(bitmapAction2);

        this.activeLayer.invalidate(simplifiedRegion);
        // this.update();

        regionCopy.dispose();
        regionCopy = null;

        let sha = new SelectionHistoryMemento(this.getName(), this.getImage(), this.getDocumentWorkspace());
        this.currentHistoryMementos.push(sha);

        this.context.dispose();
        this.context = new MoveToolContext();

        this.flushHistoryMementos(i18n("moveTool.historyMemento.dropPixels"));
    }

    onSelectionChanging() {
        super.onSelectionChanging();

        if (!this.dontDrop) {
            if (this.context.lifted) {
                this.drop();
            }

            if (this.tracking) {
                this.tracking = false;
            }
        }
    }

    onSelectionChanged() {
        if (!this.context.lifted) {
            this.destroyNubs();
            this.positionNubs(this.context.currentMode);
        }
        super.onSelectionChanged();
    }

    onPasteMouseDown() {
        // TODO : Implement the logic for pasting
    }

    onLift(mouseX, mouseY, button) {
        let liftPath = this.getSelection().createPath();
        let liftRegion = this.getSelection().createRegion();

        // Keep one immutable pre-lift image. Preview frames are always rebuilt
        // from this snapshot so transparent pixels and resampling artifacts can
        // never accumulate while dragging or rotating.
        this.scratchSurface.copySurface(this.activeLayer.getSurface());

        this.context.liftedPixels = new MaskedSurface(this.activeLayer.getSurface(), liftPath);

        let bitmapAction = new BitmapHistoryMemento(
            this.getName(),
            this.getImage(),
            this.getDocumentWorkspace(),
            this.getActiveLayerIndex(),
            liftRegion
        );
        this.currentHistoryMementos.push(bitmapAction);

        this.context.copying = this.app.isControlKeyDown();
        this.context.previewBounds = null;

        liftRegion.dispose();
        liftRegion = null;

        liftPath.dispose();
        liftPath = null;
    }

    pushContextHistoryMemento() {
        let cha = new MoveContextHistoryMemento(
            this.getDocumentWorkspace(),
            this.context,
            null,
            null
        );
        this.currentHistoryMementos.push(cha);
    }

    render(renderOffset, useNewOffset) {
        this.renderInternal(renderOffset, useNewOffset, true);
    }

    mergeDirtyRectangles(rectangles) {
        const merged = [];
        for (const rectangle of rectangles) {
            if (rectangle === null || rectangle.isEmpty()) continue;

            let candidate = rectangle.clone();
            let didMerge;
            do {
                didMerge = false;
                for (let i = merged.length - 1; i >= 0; --i) {
                    const other = merged[i];
                    const overlaps = candidate.getLeft() <= other.getRight()
                        && candidate.getRight() >= other.getLeft()
                        && candidate.getTop() <= other.getBottom()
                        && candidate.getBottom() >= other.getTop();
                    if (overlaps) {
                        candidate = Rectangle.union(candidate, other);
                        merged.splice(i, 1);
                        didMerge = true;
                    }
                }
            } while (didMerge);
            merged.push(candidate);
        }
        return merged;
    }

    renderInternal(renderOffset, useNewOffset, saveRegion) {
        let sourceBounds = Utility.roundRectangle(this.context.liftedBounds);
        sourceBounds.inflate(2, 2);
        sourceBounds.intersect(this.activeLayer.getBounds());

        let destinationBounds = Utility.roundRectangle(this.getSelection().getBounds());
        destinationBounds.inflate(2, 2);
        destinationBounds.intersect(this.activeLayer.getBounds());
        let previousBounds = this.context.previewBounds;

        // TODO wait cursor changer

        if (!this.context.copying) {
            this.context.liftedPixels.eraseFrom(this.renderArgs.getSurface());
        }
        const configuredResampling = this.getSetting("resampling", "highQualityCubic");
        const resamplingModes = {
            nearest: ResamplingAlgorithm.NEAREST_NEIGHBOR,
            linear: ResamplingAlgorithm.LINEAR,
            bilinear: ResamplingAlgorithm.LINEAR,
            multisampleLinear: ResamplingAlgorithm.MULTISAMPLE_LINEAR,
            anisotropic: ResamplingAlgorithm.ANISOTROPIC,
            highQualityCubic: ResamplingAlgorithm.HIGH_QUALITY_CUBIC,
            bicubic: ResamplingAlgorithm.HIGH_QUALITY_CUBIC
        };
        // Keep the selected interpolation mode active during interactive
        // scaling and rotation. The old fast-preview path forced nearest
        // neighbor on every pointer move, which made a newly selected mode
        // appear to be discarded as soon as the transform resumed.
        const resampling = resamplingModes[configuredResampling]
            ?? ResamplingAlgorithm.HIGH_QUALITY_CUBIC;
        this.context.liftedPixels.render(
            this.renderArgs.getSurface(),
            this.context.deltaTransform,
            resampling,
            !!this.getSetting("gammaCorrected", true)
        );

        let dirtyRectangles = [sourceBounds, destinationBounds];
        if (previousBounds !== null) dirtyRectangles.push(previousBounds);
        dirtyRectangles = this.mergeDirtyRectangles(dirtyRectangles);
        let dirtyRegion = Region.fromRectangles(dirtyRectangles);
        this.context.previewBounds = destinationBounds.clone();
        this.activeLayer.invalidate(dirtyRegion);
        this.positionNubs(this.context.currentMode);

    }

    onSettingChanged(key) {
        if (key !== "resampling" && key !== "gammaCorrected" && key !== "renderingQuality") return;
        if (!this.context.lifted || this.context.liftedPixels === null) return;

        // Paint.NET's interpolation and gamma settings are part of the active
        // transaction. Rebuild the floating-pixel preview immediately instead
        // of waiting for another drag or for the selection to be committed.
        this.cancelPendingMove();
        this.restorePreview();
        const oldFullQuality = this.fullQuality;
        this.fullQuality = true;
        try {
            this.renderInternal(this.context.offset, true, false);
        } finally {
            this.fullQuality = oldFullQuality;
        }
    }

    preRender() {
        this.restorePreview();
    }

    cancelPendingMove() {
        if (this.pendingMoveFrame !== null) {
            cancelAnimationFrame(this.pendingMoveFrame);
            this.pendingMoveFrame = null;
        }
        this.pendingMovePoint = null;
    }

    processMove(mouseX, mouseY) {
        this.processingMoveFrame = true;
        try {
            return super.onMouseMove(mouseX, mouseY);
        } finally {
            this.processingMoveFrame = false;
        }
    }

    onMouseMove(mouseX, mouseY) {
        if (!this.tracking || this.processingMoveFrame) {
            return super.onMouseMove(mouseX, mouseY);
        }

        // Pointer events can arrive much faster than the display can paint.
        // Only transform the latest position once per animation frame instead
        // of rebuilding the preview for every intermediate event.
        this.pendingMovePoint = new Point(mouseX, mouseY);
        if (this.pendingMoveFrame === null) {
            this.pendingMoveFrame = requestAnimationFrame(() => {
                this.pendingMoveFrame = null;
                const point = this.pendingMovePoint;
                this.pendingMovePoint = null;
                if (point !== null && this.tracking) {
                    this.processMove(point.getX(), point.getY());
                }
            });
        }
        return true;
    }

    restorePreview() {
        if (!this.context.lifted || this.context.liftedBounds === null) return;
        let sourceBounds = Utility.roundRectangle(this.context.liftedBounds);
        sourceBounds.inflate(2, 2);
        sourceBounds.intersect(this.activeLayer.getBounds());
        this.activeLayer.getSurface().copyRegionFrom(this.scratchSurface, sourceBounds);

        if (this.context.previewBounds !== null) {
            this.activeLayer.getSurface().copyRegionFrom(this.scratchSurface, this.context.previewBounds);
        }
    }

    onMouseUp(mouseX, mouseY, button) {
        this.cancelPendingMove();
        this.fullQuality = true;
        let consumed = super.onMouseUp(mouseX, mouseY, button);

        if (!this.tracking) {
            this.fullQuality = false;
            return consumed;
        }

        // Flush the exact release position synchronously at final quality.
        this.processMove(mouseX, mouseY);
        this.fullQuality = false;

        this.rotateNub.setVisible(false);
        this.tracking = false;
        this.positionNubs(this.context.currentMode);

        let resourceName;
        switch (this.context.currentMode) {
            default:
                throw new Error("Invalid enum argument");

            case MoveToolBaseMode.ROTATE:
                resourceName = "moveTool.historyMemento.rotate";
                break;

            case MoveToolBaseMode.SCALE:
                resourceName = "moveTool.historyMemento.scale";
                break;

            case MoveToolBaseMode.TRANSLATE:
                resourceName = "moveTool.historyMemento.translate";
                break;
        }

        this.context.startAngle += this.angleDelta;

        if (this.context.liftTransform == null) {
            this.context.liftTransform = new Matrix();
        }

        this.context.liftTransform.reset();
        this.context.liftTransform.multiply(this.context.deltaTransform, MatrixOrder.APPEND);

        let actionName = i18n(resourceName);
        this.flushHistoryMementos(actionName);

        return consumed;
    }

    flushHistoryMementos(name) {
        if (this.currentHistoryMementos.length > 0) {
            let cha = new CompoundHistoryMemento(null, null, this.currentHistoryMementos);

            let haName;
            let image;

            if (this.didPaste) {
                haName = i18n("commonAction.paste");
                image = "assets/icons/menu_edit_paste_icon.png";
                this.didPaste = false;
            } else {
                if (name === null) {
                    haName = this.getName();
                } else {
                    haName = name;
                }
                image = this.getImage();
            }

            let ctha = new CompoundToolHistoryMemento(cha, this.getDocumentWorkspace(), haName, image);

            // ctha.setSeriesGuid(this.context.seriesGuid); // TODO implement seriesGuid
            this.getDocumentWorkspace().getHistory().pushNewMemento(ctha);

            this.currentHistoryMementos = [];
        }
    }

    dispose() {
        super.dispose();

        this.destroyNubs();

        if (this.context !== null) {
            this.context.dispose();
            this.context = null;
        }

        if (this.renderArgs !== null) {
            this.renderArgs.dispose();
            this.renderArgs = null;
        }
    }

    onExecutingHistoryMemento() {
        this.dontDrop = true;

        this.restorePreview();
    }

    onExecutedHistoryMemento() {
        if (this.context.lifted) {
            let oldHQ = this.fullQuality;
            this.fullQuality = false;
            this.render(this.context.offset, true);
            // this.clearSavedMemory();
            this.fullQuality = oldHQ;
        } else {
            this.destroyNubs();
            this.positionNubs(this.context.currentMode);
        }

        this.dontDrop = false;
    }
}

class MoveToolContext extends MoveToolBaseContext {

    constructor() {
        super();

        this.liftedPixels = null;
        this.poLiftedPixels = null;
        this.copying = false;
        this.previewBounds = null;
    }

    clone() {
        const base = super.clone();
        const clone = new MoveToolContext();
        Object.assign(clone, base);
        clone.liftedPixels = this.liftedPixels === null ? null : this.liftedPixels.clone();
        clone.poLiftedPixels = this.poLiftedPixels;
        clone.copying = this.copying;
        clone.previewBounds = this.previewBounds === null ? null : this.previewBounds.clone();
        return clone;
    }

    dispose() {
        if (this.liftedPixels !== null) {
            this.liftedPixels.dispose();
            this.liftedPixels = null;
        }
        if (this.baseTransform !== null) this.baseTransform.dispose();
        if (this.liftTransform !== null) this.liftTransform.dispose();
        if (this.deltaTransform !== null) this.deltaTransform.dispose();
        if (this.startPath !== null) this.startPath.dispose();
    }

}
