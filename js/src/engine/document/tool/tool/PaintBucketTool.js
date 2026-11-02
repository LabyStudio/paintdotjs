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

class PaintBucketTool extends Tool {
    constructor(type) {
        super(type);
        this.pending = false;
        this.drawing = false;
        this.tracking = false;
        this.origin = null;
        this.dragStart = null;
        this.originStart = null;
        this.button = MouseButton.LEFT;
        this.originNub = null;
        this.sampleSnapshot = null;
        this.colorsForm = null;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.drawHistoryPushed = false;
        this.editingStartState = null;
        this.lastPendingState = null;
        this.pendingEditStartState = null;
        this.pendingEditTimer = null;
        this.pendingEditExpireTime = 0;
        this.activePointerIds = new Set();
        this.pointerDownListener = event => this.activePointerIds.add(event.pointerId);
        this.pointerUpListener = event => {
            this.activePointerIds.delete(event.pointerId);
            this.checkPendingEdit();
        };
        this.pointerBlurListener = () => {
            this.activePointerIds.clear();
            this.checkPendingEdit();
        };
        this.colorsChangedListener = () => {
            const previousState = this.lastPendingState;
            if (this.restoredColors !== null && this.colorsForm !== null) {
                this.restoredColors = {
                    primary: this.colorsForm.mainColor.copy(),
                    secondary: this.colorsForm.secondaryColor.copy()
                };
            }
            if (this.pending) {
                this.renderPending();
                this.schedulePendingEdit(previousState);
                this.lastPendingState = this.capturePendingState();
            }
        };
    }

    onActivate() {
        super.onActivate();
        this.colorsForm = FormRegistry.get("colorsForm");
        if (this.colorsForm?.changed !== undefined) {
            this.colorsForm.changed.add(this.colorsChangedListener);
        }
        document.addEventListener("pointerdown", this.pointerDownListener, true);
        document.addEventListener("pointerup", this.pointerUpListener, true);
        document.addEventListener("pointercancel", this.pointerUpListener, true);
        window.addEventListener("blur", this.pointerBlurListener);
        this.app.setCursorImg("paint_bucket_tool_cursor");
    }

    onDeactivate() {
        const colorsForm = this.colorsForm;
        if (this.pending) {
            this.commitPending();
        }
        this.colorsForm = null;
        if (typeof colorsForm?.changed?.remove === "function") {
            colorsForm.changed.remove(this.colorsChangedListener);
        }
        document.removeEventListener("pointerdown", this.pointerDownListener, true);
        document.removeEventListener("pointerup", this.pointerUpListener, true);
        document.removeEventListener("pointercancel", this.pointerUpListener, true);
        window.removeEventListener("blur", this.pointerBlurListener);
        this.activePointerIds.clear();
        this.destroyNub();
        super.onDeactivate();
    }

    onMouseDown(x, y, button) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) {
            return false;
        }
        const point = new Point(x, y);
        if (this.pending && this.originNub !== null && this.originNub.isPointTouching(point, true)) {
            this.flushPendingEdit();
            this.tracking = true;
            this.editingStartState = this.capturePendingState();
            this.dragStart = point;
            this.originStart = this.origin.clone();
            this.app.setCursorImg("hand_closed_cursor");
            return true;
        }
        if (this.pending) {
            this.commitPending();
        }
        const surface = this.getActiveLayer().getSurface();
        if (!surface.getBounds().contains(point)) {
            return false;
        }
        this.beginBitmapTransaction();
        const sampleSurface = this.getSetting("sampleMode", "layer") === "image"
            ? this.getDocumentWorkspace().getCompositionSurface()
            : surface;
        this.sampleSnapshot = sampleSurface.clone();
        this.origin = point;
        this.button = button;
        this.drawing = true;
        this.pending = true;
        this.drawHistoryPushed = false;
        this.editingStartState = null;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.lastPendingState = this.capturePendingState();
        this.renderPending();
        this.positionNub();
        return true;
    }

    onMouseMove(x, y) {
        if (!this.tracking) {
            return false;
        }
        this.origin = new Point(
            this.originStart.x + x - this.dragStart.x,
            this.originStart.y + y - this.dragStart.y
        );
        this.renderPending();
        this.positionNub();
        return true;
    }

    onMouseUp(x, y, button) {
        if (this.drawing && button === this.button) {
            this.drawing = false;
            this.pushDrawHistoryMemento();
            return true;
        }
        if (!this.tracking) {
            return false;
        }
        this.onMouseMove(x, y);
        this.tracking = false;
        if (this.editingStartState !== null) {
            this.historyStack.pushNewMemento(new PaintBucketEditHistoryMemento(
                this.getDocumentWorkspace(), this.editingStartState,
                i18n("paintBucketTool.changed.generic.historyMementoName"), this.getImage()
            ));
            this.editingStartState = null;
        }
        this.lastPendingState = this.capturePendingState();
        this.app.setCursorImg("paint_bucket_tool_cursor");
        return true;
    }

    onKeyPress(key) {
        if (!this.pending) {
            return false;
        }
        if (key === "Enter") {
            return this.commitPending();
        }
        if (key === "Escape") {
            return this.commitPending();
        }
        return false;
    }

    onSettingChanged(key, value) {
        if (!this.pending) {
            return;
        }
        const previousState = this.lastPendingState;
        if (this.restoredSettings !== null && key !== undefined) {
            this.restoredSettings[key] = value;
        }
        if (key === "sampleMode") {
            const bounds = this.bitmapTransaction.dirtyBounds;
            if (bounds !== null && !bounds.isEmpty()) {
                this.getActiveLayer().getSurface().copyRegionFrom(this.scratchSurface, bounds);
                this.getActiveLayer().invalidate(bounds);
            }
            this.disposeSampleSnapshot();
            const sampleSurface = this.getSetting("sampleMode", "layer") === "image"
                ? this.getDocumentWorkspace().getCompositionSurface()
                : this.scratchSurface;
            this.sampleSnapshot = sampleSurface.clone();
            this.bitmapTransaction.dirtyBounds = null;
        }
        this.renderPending();
        this.schedulePendingEdit(previousState);
        this.lastPendingState = this.capturePendingState();
    }

    getSetting(name, fallback = null) {
        if (this.restoredSettings !== null
            && Object.prototype.hasOwnProperty.call(this.restoredSettings, name)) {
            return this.restoredSettings[name];
        }
        return super.getSetting(name, fallback);
    }

    getColor(button = MouseButton.LEFT) {
        if (this.restoredColors !== null) {
            return (button === MouseButton.RIGHT
                ? this.restoredColors.secondary : this.restoredColors.primary).copy();
        }
        return super.getColor(button);
    }

    onExecutingHistoryMemento() {
        // HistoryStack asks the tool to settle live transactions before it
        // chooses the memento to execute. This makes an immediate Ctrl+Z undo
        // the grouped color edit instead of removing the whole fill.
        this.flushPendingEdit();
    }

    renderPending() {
        if (!this.pending || this.bitmapTransaction === null) {
            return false;
        }
        const surface = this.getActiveLayer().getSurface();
        const width = surface.width;
        const height = surface.height;
        const x = Math.floor(this.origin.x);
        const y = Math.floor(this.origin.y);
        const previousBounds = this.bitmapTransaction.dirtyBounds === null
            ? null : this.bitmapTransaction.dirtyBounds.clone();

        if (x < 0 || y < 0 || x >= width || y >= height) {
            if (previousBounds !== null) {
                surface.copyRegionFrom(this.scratchSurface, previousBounds);
                this.getActiveLayer().invalidate(previousBounds);
            }
            this.bitmapTransaction.dirtyBounds = null;
            return true;
        }

        const baseImage = this.scratchSurface.context.getImageData(0, 0, width, height);
        const data = baseImage.data;
        const sampleData = this.sampleSnapshot.context.getImageData(0, 0, width, height).data;
        const start = (y * width + x) * 4;
        const target = [sampleData[start], sampleData[start + 1], sampleData[start + 2], sampleData[start + 3]];
        const color = this.getColor(this.button);
        const backgroundColor = this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT);
        const tolerance = this.getToleranceThreshold();
        const floodMode = this.app.isShiftKeyDown() ? "global" : this.getSetting("floodMode", "contiguous");
        const premultiplied = this.getSetting("alphaMode", "premultiplied") === "premultiplied";
        const selectionPath = this.createSelectionPath();
        const visited = new Uint8Array(width * height);
        const stack = [x, y];
        let minX = width, minY = height, maxX = -1, maxY = -1;
        const matches = (px, py) => {
            if (px < 0 || py < 0 || px >= width || py >= height) {
                return false;
            }
            const pixel = py * width + px;
            if (visited[pixel]) {
                return false;
            }
            if (selectionPath !== null
                && !surface.context.isPointInPath(selectionPath, px + 0.5, py + 0.5, "evenodd")) {
                return false;
            }
            return this.matchesColorTolerance(sampleData, pixel * 4, target, tolerance, premultiplied);
        };
        const paint = (px, py) => {
            const pixel = py * width + px;
            visited[pixel] = 1;
            const i = pixel * 4;
            const replacement = this.getFillColorAt(px, py, color, backgroundColor);
            this.blendPixel(data, i, replacement);
            minX = Math.min(minX, px); minY = Math.min(minY, py);
            maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
        };

        if (floodMode === "global") {
            for (let py = 0; py < height; ++py) {
                for (let px = 0; px < width; ++px) {
                    if (matches(px, py)) {
                        paint(px, py);
                    }
                    else {
                        visited[py * width + px] = 1;
                    }
                }
            }
        } else {
            while (stack.length > 0) {
                const seedY = stack.pop();
                const seedX = stack.pop();
                if (!matches(seedX, seedY)) {
                    continue;
                }
                let left = seedX;
                while (matches(left - 1, seedY)) {
                    --left;
                }
                let spanUp = false, spanDown = false;
                for (let px = left; matches(px, seedY); ++px) {
                    paint(px, seedY);
                    if (matches(px, seedY - 1)) {
                        if (!spanUp) {
                            stack.push(px, seedY - 1);
                        }
                        spanUp = true;
                    } else {
                        spanUp = false;
                    }
                    if (matches(px, seedY + 1)) {
                        if (!spanDown) {
                            stack.push(px, seedY + 1);
                        }
                        spanDown = true;
                    } else {
                        spanDown = false;
                    }
                }
            }
        }

        const nextBounds = maxX < minX
            ? new Rectangle(x, y, 0, 0)
            : Rectangle.absolute(minX, minY, maxX + 1, maxY + 1);
        let dirtyBounds = previousBounds === null
            ? nextBounds : Rectangle.union(previousBounds, nextBounds);
        dirtyBounds.intersect(surface.getBounds());
        if (!dirtyBounds.isEmpty()) {
            surface.copyRegionFrom(this.scratchSurface, dirtyBounds);
            if (!nextBounds.isEmpty()) {
                surface.context.putImageData(baseImage, 0, 0,
                    nextBounds.x, nextBounds.y, nextBounds.width, nextBounds.height);
            }
            this.getActiveLayer().invalidate(dirtyBounds);
        }
        this.bitmapTransaction.dirtyBounds = nextBounds;
        return true;
    }

    commitPending() {
        if (!this.pending) {
            return false;
        }
        // A tool switch or Finish may arrive before the pointer-up callback.
        // Preserve the original Draw -> Commit history sequence in that case.
        this.pushDrawHistoryMemento();
        this.flushPendingEdit();
        const state = this.capturePendingState();
        this.pending = false;
        this.drawing = false;
        this.tracking = false;
        this.editingStartState = null;
        this.destroyNub();
        this.disposeSampleSnapshot();
        const bitmapMemento = this.takeBitmapTransactionMemento();
        if (bitmapMemento !== null) {
            this.historyStack.pushNewMemento(new PaintBucketCommitHistoryMemento(
                this.getDocumentWorkspace(), state, bitmapMemento,
                i18n("paintBucketTool.commitChanges.historyMementoName"), this.getImage(), true
            ));
        }
        this.drawHistoryPushed = false;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.lastPendingState = null;
        this.clearPendingEdit();
        this.app.setCursorImg("paint_bucket_tool_cursor");
        return true;
    }

    cancelPending() {
        if (!this.pending) {
            return false;
        }
        this.pending = false;
        this.drawing = false;
        this.tracking = false;
        this.editingStartState = null;
        this.destroyNub();
        this.disposeSampleSnapshot();
        this.cancelBitmapTransaction();
        this.drawHistoryPushed = false;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.lastPendingState = null;
        this.clearPendingEdit();
        this.app.setCursorImg("paint_bucket_tool_cursor");
        return true;
    }

    pushDrawHistoryMemento() {
        if (this.drawHistoryPushed) {
            return;
        }
        this.historyStack.pushNewMemento(new PaintBucketDrawHistoryMemento(
            this.getDocumentWorkspace(),
            i18n("paintBucketTool.endDrawing.historyMementoName"), this.getImage()
        ));
        this.drawHistoryPushed = true;
    }

    schedulePendingEdit(previousState) {
        if (!this.drawHistoryPushed || previousState === null) {
            return;
        }
        if (this.pendingEditStartState === null) {
            this.pendingEditStartState = previousState;
        }
        this.pendingEditExpireTime = Date.now() + 500;
        this.armPendingEditTimer();
    }

    armPendingEditTimer(delay = 100) {
        clearTimeout(this.pendingEditTimer);
        this.pendingEditTimer = setTimeout(() => this.checkPendingEdit(), delay);
    }

    checkPendingEdit() {
        if (this.pendingEditStartState === null) {
            return;
        }
        const remaining = this.pendingEditExpireTime - Date.now();
        if (remaining > 0 || this.activePointerIds.size > 0) {
            this.armPendingEditTimer(Math.max(1, Math.min(100, remaining > 0 ? remaining : 100)));
            return;
        }
        this.flushPendingEdit();
    }

    flushPendingEdit() {
        if (this.pendingEditStartState === null) {
            return false;
        }
        const previousState = this.pendingEditStartState;
        this.pendingEditStartState = null;
        clearTimeout(this.pendingEditTimer);
        this.pendingEditTimer = null;
        this.historyStack.pushNewMemento(new PaintBucketEditHistoryMemento(
            this.getDocumentWorkspace(), previousState,
            i18n("paintBucketTool.changed.generic.historyMementoName"), this.getImage()
        ));
        return true;
    }

    clearPendingEdit() {
        clearTimeout(this.pendingEditTimer);
        this.pendingEditTimer = null;
        this.pendingEditStartState = null;
        this.pendingEditExpireTime = 0;
    }

    capturePendingState() {
        const colors = this.colorsForm === null ? null : {
            primary: this.colorsForm.mainColor.copy(),
            secondary: this.colorsForm.secondaryColor.copy()
        };
        return {
            origin: this.origin.clone(),
            button: this.button,
            settings: Object.assign({}, this.restoredSettings === null
                ? this.type.settings : this.restoredSettings),
            colors: this.restoredColors === null ? colors : {
                primary: this.restoredColors.primary.copy(),
                secondary: this.restoredColors.secondary.copy()
            }
        };
    }

    restorePendingState(state) {
        this.clearPendingEdit();
        if (this.bitmapTransaction !== null) {
            this.cancelBitmapTransaction();
        }
        this.beginBitmapTransaction();
        this.origin = state.origin.clone();
        this.button = state.button;
        this.restoredSettings = Object.assign({}, state.settings);
        this.restoredColors = state.colors === null ? null : {
            primary: state.colors.primary.copy(),
            secondary: state.colors.secondary.copy()
        };
        const sampleSurface = this.getSetting("sampleMode", "layer") === "image"
            ? this.getDocumentWorkspace().getCompositionSurface()
            : this.getActiveLayer().getSurface();
        this.sampleSnapshot = sampleSurface.clone();
        this.pending = true;
        this.drawing = false;
        this.tracking = false;
        this.editingStartState = null;
        this.drawHistoryPushed = true;
        this.renderPending();
        this.lastPendingState = this.capturePendingState();
        this.positionNub();
        this.app.setCursorImg("paint_bucket_tool_cursor");
    }

    disposeSampleSnapshot() {
        if (this.sampleSnapshot !== null) {
            this.sampleSnapshot.dispose();
        }
        this.sampleSnapshot = null;
    }

    positionNub() {
        if (this.originNub === null) {
            this.originNub = new MoveNubRenderer(this.getSurfaceBox());
            this.originNub.setShape(MoveNubShape.CIRCLE);
            this.getSurfaceBox().addRenderer(this.originNub);
        }
        this.originNub.setLocation(new Point(Math.floor(this.origin.x) + 0.5, Math.floor(this.origin.y) + 0.5));
        this.originNub.setVisible(true);
    }

    destroyNub() {
        if (this.originNub === null) {
            return;
        }
        this.getSurfaceBox().removeRenderer(this.originNub);
        this.originNub.dispose();
        this.originNub = null;
    }

    createSelectionPath() {
        if (this.getSelection().isEmpty()) {
            return null;
        }
        const selection = this.getSelection().createPath();
        const result = new Path2D();
        for (const list of selection.getVertexLists()) {
            const points = list.getVertices();
            if (points.length === 0) {
                continue;
            }
            result.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; ++i) {
                result.lineTo(points[i].x, points[i].y);
            }
            result.closePath();
        }
        selection.dispose();
        return result;
    }
}
