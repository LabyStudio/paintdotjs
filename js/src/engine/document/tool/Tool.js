class Tool {

    static saveTileGranularity = 32;

    constructor(type) {
        this.type = type;
        this.app = app;

        this.selectionChangingListener = this.onSelectionChanging.bind(this);
        this.selectionChangedListener = this.onSelectionChanged.bind(this);
        this.historyExecutingListener = this.onExecutingHistoryMemento.bind(this);
        this.historyExecutedListener = this.onExecutedHistoryMemento.bind(this);

        this.selection = null;
        this.historyStack = null;
        this.active = false;

        this.scratchSurface = null;
        this.savedTiles = null;
        this.savedRegion = null;
    }

    getType() {
        return this.type;
    }

    onActivate() {
        this.selection = this.getSelection();
        this.selection.changing.add(this.selectionChangingListener);
        this.selection.changed.add(this.selectionChangedListener);

        this.historyStack = this.getDocumentWorkspace().getHistory();
        this.historyStack.executing.add(this.historyExecutingListener);
        this.historyStack.executed.add(this.historyExecutedListener);

        this.scratchSurface = this.getDocumentWorkspace().borrowScratchSurface(this.type.getName());
        this.active = true;
    }

    onDeactivate() {
        this.active = false;

        this.selection.changing.remove(this.selectionChangingListener);
        this.selection.changed.remove(this.selectionChangedListener);

        this.historyStack.executing.remove(this.historyExecutingListener);
        this.historyStack.executed.remove(this.historyExecutedListener);

        this.getDocumentWorkspace().returnScratchSurface(this.scratchSurface);
    }

    onSelectionChanging() {

    }

    onSelectionChanged() {

    }

    onExecutingHistoryMemento() {

    }

    onExecutedHistoryMemento() {

    }

    onPulse() {
        // TODO panTracking & right click
    }

    onKeyPress(key) {
        return false;
    }

    onMouseDown(mouseX, mouseY, button) {
        return false;
    }

    onMouseMove(mouseX, mouseY) {
        return false;
    }

    onMouseUp(mouseX, mouseY, button) {
        return false;
    }

    dispose() {

    }

    saveRegion(saveMeRegion, saveMeBounds) {
        let activeLayer = this.getActiveLayer();

        if (this.savedTiles === null) {
            this.savedTiles = new BitVector2D(
                Math.floor((activeLayer.getWidth() + Tool.saveTileGranularity - 1) / Tool.saveTileGranularity),
                Math.floor((activeLayer.getHeight() + Tool.saveTileGranularity - 1) / Tool.saveTileGranularity)
            );
            this.savedTiles.clear(false);
        }

        let regionBounds;
        if (saveMeRegion == null) {
            regionBounds = saveMeBounds;
        } else {
            regionBounds = saveMeRegion.getBounds();
        }

        let bounds = Rectangle.union(regionBounds, saveMeBounds);
        bounds.intersect(activeLayer.getBounds());

        let leftTile = Math.floor(bounds.getLeft() / Tool.saveTileGranularity);
        let topTile = Math.floor(bounds.getTop() / Tool.saveTileGranularity);
        let rightTile = Math.floor((bounds.getRight() - 1) / Tool.saveTileGranularity);
        let bottomTile = Math.floor((bounds.getBottom() - 1) / Tool.saveTileGranularity);

        for (let tileY = topTile; tileY <= bottomTile; ++tileY) {
            let rowAccumBounds = Rectangle.empty();

            for (let tileX = leftTile; tileX <= rightTile; ++tileX) {
                if (!this.savedTiles.get(tileX, tileY)) {
                    let tileBounds = new Rectangle(
                        tileX * Tool.saveTileGranularity,
                        tileY * Tool.saveTileGranularity,
                        Tool.saveTileGranularity,
                        Tool.saveTileGranularity
                    );

                    tileBounds.intersect(activeLayer.getBounds());

                    if (rowAccumBounds.isEmpty()) {
                        rowAccumBounds = tileBounds;
                    } else {
                        rowAccumBounds = Rectangle.union(rowAccumBounds, tileBounds);
                    }

                    this.savedTiles.set(tileX, tileY, true);
                } else {
                    if (!rowAccumBounds.isEmpty()) {
                        activeLayer.getSurface().copySurface(this.scratchSurface, rowAccumBounds);
                        rowAccumBounds = Rectangle.empty();
                    }
                }
            }

            if (!rowAccumBounds.isEmpty()) {
                activeLayer.getSurface().copySurface(this.scratchSurface, rowAccumBounds);
                rowAccumBounds = Rectangle.empty();
            }
        }

        if (this.savedRegion != null) {
            this.savedRegion.dispose();
            this.savedRegion = null;
        }

        if (saveMeRegion != null) {
            this.savedRegion = saveMeRegion.clone();
        }
    }

    restoreSavedRegion() {
        if (this.savedRegion != null) {
            let activeLayer = this.getActiveLayer();
            activeLayer.getSurface().copySurface(this.scratchSurface, this.savedRegion);
            activeLayer.invalidate(this.savedRegion);
            this.savedRegion.dispose();
            this.savedRegion = null;
        }
    }

    isActive() {
        return this.active;
    }

    getName() {
        return this.type.getName();
    }

    getImage() {
        return this.type.getIconSrc();
    }

    getDocumentWorkspace() {
        return this.app.getActiveDocumentWorkspace();
    }

    getSurfaceBox() {
        return this.getDocumentWorkspace().getSurfaceBox();
    }

    getSelection() {
        return this.getDocumentWorkspace().getSelection();
    }

    getActiveLayerIndex() {
        return this.getDocumentWorkspace().getActiveLayerIndex();
    }

    setActiveLayerIndex(index) {
        this.getDocumentWorkspace().setActiveLayerIndex(index);
    }

    getActiveLayer() {
        return this.getDocumentWorkspace().getActiveLayer();
    }

    setActiveLayer(layer) {
        this.getDocumentWorkspace().setActiveLayer(layer);
    }
}