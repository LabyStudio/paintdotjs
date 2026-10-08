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

class MoveTool extends MoveToolBase {

    constructor(type) {
        super(type);

        this.context = new MoveToolContext();
        this.enableOutline = false;

        this.fullQuality = false;
        this.activeLayer = null;
        this.renderArgs = null;
        this.didPaste = false;
        this.pendingPasteSurface = null;
        this.pendingPasteUnderlay = null;
        this.pendingPasteOrigin = null;
        this.pendingMoveFrame = null;
        this.pendingMovePoint = null;
        this.processingMoveFrame = false;
        this.exactPreviewRestoreRequired = false;
    }

    onActivate() {
        if (MaskedSurface.gpuRenderer === undefined) {
            const prepareRenderer = () => MaskedSurface.getGpuRenderer();
            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(prepareRenderer, {timeout: 1000});
            } else {
                setTimeout(prepareRenderer, 0);
            }
        }

        // TODO find the texture for the move tool cursor
        // this.app.setCursorImg("move_tool_cursor");

        this.context.lifted = false;
        this.context.liftedPixels = null;
        this.context.offset = new Point(0, 0);
        this.context.liftedBounds = this.getSelection().getBounds();
        this.activeLayer = this.getActiveLayer();
        this.exactPreviewRestoreRequired = false;

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

        if (this.pendingPasteSurface !== null) {
            this.pendingPasteSurface.dispose();
            this.pendingPasteSurface = null;
        }
        if (this.pendingPasteUnderlay !== null) {
            this.pendingPasteUnderlay.dispose();
            this.pendingPasteUnderlay = null;
        }
        this.pendingPasteOrigin = null;

        this.tracking = false;
        this.destroyNubs();

        super.onDeactivate();
    }

    setPendingPaste(image, underlay = null, origin = null) {
        if (this.pendingPasteSurface !== null) {
            this.pendingPasteSurface.dispose();
        }
        if (this.pendingPasteUnderlay !== null) {
            this.pendingPasteUnderlay.dispose();
        }
        this.pendingPasteSurface = Surface.create(image.width, image.height);
        this.pendingPasteSurface.context.drawImage(image, 0, 0);
        this.pendingPasteUnderlay = underlay === null ? null : underlay.clone();
        this.pendingPasteOrigin = origin === null ? new Point(0, 0) : origin.clone();
    }

    drop() {
        // The final restore must be synchronous and pixel-exact. The normal
        // preview restore uses drawImage so dragging stays GPU accelerated,
        // but Chromium may defer that cross-canvas copy. If the final render
        // follows immediately, its transparent padding can then expose the
        // preceding clearRect as an axis-aligned checkerboard outline.
        this.restorePreview(true);
        this.exactPreviewRestoreRequired = false;

        // Keep the floating-pixel transaction itself in the Finish history
        // entry. Undoing Finish must restore this context before older move
        // actions are allowed to run, just like Paint.NET's
        // TransactedToolUndoCommitHistoryMemento restores MoveToolChanges.
        let contextAction = new MoveContextHistoryMemento(
            this.getDocumentWorkspace(), this.context,
            this.getName(), this.getImage(), true
        );
        this.currentHistoryMementos.push(contextAction);

        // Capture and invalidate the resampler's complete output footprint.
        // A rotated bitmap crop can extend beyond the transformed selection by
        // a pixel before the filter padding is added. Using only the selection
        // bounds leaves that outer strip stale in the composition surface.
        const commitBounds = this.context.liftedPixels.getTransformedBounds(
            this.context.deltaTransform,
            this.activeLayer.getSurface()
        );
        let simplifiedRegion = Region.fromRectangle(commitBounds);
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
        const isPaste = this.pendingPasteSurface !== null;

        // Keep one immutable pre-lift image. Preview frames are always rebuilt
        // from this snapshot so transparent pixels and resampling artifacts can
        // never accumulate while dragging or rotating.
        if (isPaste && this.pendingPasteUnderlay !== null) {
            this.scratchSurface.copySurface(this.pendingPasteUnderlay);
        } else {
            this.scratchSurface.copySurface(this.activeLayer.getSurface());
        }

        // A paste may extend beyond the document. Its visible preview is clipped by
        // the layer canvas, but keep the original source until the floating pixels
        // are committed so dragging can bring the overflow back into view.
        if (this.pendingPasteSurface !== null) {
            this.context.liftedPixels = new MaskedSurface(
                this.pendingPasteSurface, liftPath, true, this.pendingPasteOrigin);
            this.pendingPasteSurface.dispose();
            this.pendingPasteSurface = null;
            this.pendingPasteOrigin = null;
            if (this.pendingPasteUnderlay !== null) {
                this.pendingPasteUnderlay.dispose();
                this.pendingPasteUnderlay = null;
            }
        } else {
            this.context.liftedPixels = new MaskedSurface(this.activeLayer.getSurface(), liftPath, true);
        }

        let bitmapAction = new BitmapHistoryMemento(
            this.getName(),
            this.getImage(),
            this.getDocumentWorkspace(),
            this.getActiveLayerIndex(),
            liftRegion
        );
        this.currentHistoryMementos.push(bitmapAction);

        // Pasted pixels do not originate in the active layer. Treat them like
        // copied content so moving the floating paste never erases its source
        // rectangle from the preserved underlay.
        this.context.copying = isPaste || this.app.isControlKeyDown();
        this.context.previewBounds = null;
        this.exactPreviewRestoreRequired = false;

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
            if (rectangle === null || rectangle.isEmpty()) {
                continue;
            }

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

        // This must match the renderer's actual padded bitmap footprint, not
        // merely the transformed selection path. The integer source crop may
        // be up to one pixel larger than that path after rotation.
        let destinationBounds = this.context.liftedPixels.getTransformedBounds(
            this.context.deltaTransform,
            this.activeLayer.getSurface()
        );
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
            !!this.getSetting("gammaCorrected", true),
            this.fullQuality,
            this.getSetting("renderingQuality", "high")
        );

        let dirtyRectangles = [sourceBounds, destinationBounds];
        if (previousBounds !== null) {
            dirtyRectangles.push(previousBounds);
        }
        dirtyRectangles = this.mergeDirtyRectangles(dirtyRectangles);
        let dirtyRegion = Region.fromRectangles(dirtyRectangles);
        this.context.previewBounds = destinationBounds.clone();
        this.activeLayer.invalidate(dirtyRegion);
        this.positionNubs(this.context.currentMode);

    }

    onSettingChanged(key) {
        if (key !== "resampling" && key !== "gammaCorrected" && key !== "renderingQuality") {
            return;
        }
        if (!this.context.lifted || this.context.liftedPixels === null) {
            return;
        }

        // Paint.NET's interpolation and gamma settings are part of the active
        // transaction. Rebuild the floating-pixel preview immediately instead
        // of waiting for another drag or for the selection to be committed.
        this.cancelPendingMove();
        this.restorePreviewBeforeRender();
        const oldFullQuality = this.fullQuality;
        this.fullQuality = true;
        try {
            this.renderInternal(this.context.offset, true, false);
        } finally {
            this.fullQuality = oldFullQuality;
        }
    }

    preRender() {
        this.restorePreviewBeforeRender();
    }

    restorePreviewBeforeRender() {
        const exact = this.exactPreviewRestoreRequired;
        this.exactPreviewRestoreRequired = false;
        this.restorePreview(exact);
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

    restorePreview(exact = false) {
        if (!this.context.lifted || this.context.liftedBounds === null) {
            return;
        }
        const restore = exact
            ? (surface, rectangle) => surface.copyRegionFromExact(this.scratchSurface, rectangle)
            : (surface, rectangle) => surface.copyRegionFrom(this.scratchSurface, rectangle);
        const surface = this.activeLayer.getSurface();
        let sourceBounds = Utility.roundRectangle(this.context.liftedBounds);
        sourceBounds.inflate(2, 2);
        sourceBounds.intersect(this.activeLayer.getBounds());
        restore(surface, sourceBounds);

        if (this.context.previewBounds !== null) {
            restore(surface, this.context.previewBounds);
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

        if (this.pendingPasteSurface !== null) {
            this.pendingPasteSurface.dispose();
            this.pendingPasteSurface = null;
        }
        if (this.pendingPasteUnderlay !== null) {
            this.pendingPasteUnderlay.dispose();
            this.pendingPasteUnderlay = null;
        }

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
        this.exactPreviewRestoreRequired = false;

        if (this.context.lifted && this.activeLayer !== null
            && this.scratchSurface !== null) {
            // History can jump between transforms whose filtered render
            // footprints are larger than the selection/preview rectangles.
            // Restore the complete pre-lift image so no pixels from the newer
            // floating position survive before the older context is rendered.
            this.activeLayer.getSurface().copySurface(this.scratchSurface);
            this.activeLayer.invalidate();
            this.context.previewBounds = null;
        } else {
            this.restorePreview();
        }
    }

    onExecutedHistoryMemento() {
        if (this.context.lifted) {
            let oldHQ = this.fullQuality;
            this.fullQuality = false;
            this.render(this.context.offset, true);
            // this.clearSavedMemory();
            this.fullQuality = oldHQ;

            // Undoing Finish revives the floating preview. Its first movement
            // must restore the position drawn above before painting the new
            // one. A drawImage-based canvas copy may be deferred until after
            // that next render, leaving the old position duplicated. Pay for
            // one synchronous pixel copy on that first restore; subsequent
            // drag frames keep using the accelerated preview path.
            this.exactPreviewRestoreRequired = true;
        } else {
            this.exactPreviewRestoreRequired = false;
            this.destroyNubs();
            this.positionNubs(this.context.currentMode);
        }

        this.dontDrop = false;
    }
}
