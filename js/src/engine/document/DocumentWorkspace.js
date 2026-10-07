class DocumentWorkspace extends DocumentView {

    constructor(app) {
        super(app);

        this.fileName = null;
        this.filePath = null;
        this.fileHandle = null;
        this.fileFormat = null;
        this.saveOptions = null;
        this.dirty = false;
        this.activeLayer = null;
        this.history = new HistoryStack(app, this);
        this.gridVisible = typeof AppSettingsStore !== "undefined"
            && AppSettingsStore.get("workspace.showPixelGrid", false) === true;
        this.rulersVisible = typeof AppSettingsStore !== "undefined"
            && AppSettingsStore.get("workspace.showRulers", false) === true;
        this.gridRenderer.setVisible(this.gridVisible);
        this.history.executed.add(() => this.setDirty(true));
        this.selection = new Selection();
        this.selection.changed.add(() => {
            this.app.fire("document:selection_changed", this);
        });

        this.selectionRenderer = new SelectionRenderer(this.surfaceBox, this.selection);
        this.selectionRenderer.setSelectionOutline(true);
        this.selectionRenderer.setSelectionTinting(false);
        this.selectionRenderer.setOutlineAnimation(true);
        this.surfaceBox.addRenderer(this.selectionRenderer);

        this.scratchSurface = null;
        this.isScratchSurfaceBorrowed = false;
        this.borrowScratchSurfaceReason = null;

        // Bind instance methods
        this.onLayerRemoving = this.onLayerRemoving.bind(this);
        this.onLayerInserted = this.onLayerInserted.bind(this);
        this.onLayersChanged = this.onLayersChanged.bind(this);
    }

    onDocumentChanging() {
        super.onDocumentChanging();

        // Remove event handlers from old document
        if (this.document !== null) {
            this.document.getLayers().removingAt.remove(this.onLayerRemoving);
            this.document.getLayers().insertedAt.remove(this.onLayerInserted);
            this.document.getLayers().changed.remove(this.onLayersChanged);
        }
    }

    onDocumentChanged() {
        super.onDocumentChanged();

        // Add event handlers to new document
        this.document.getLayers().removingAt.add(this.onLayerRemoving);
        this.document.getLayers().insertedAt.add(this.onLayerInserted);
        this.document.getLayers().changed.add(this.onLayersChanged);

        if (this.scratchSurface !== null) {
            if (this.isScratchSurfaceBorrowed) {
                throw new Error("scratchSurface is currently borrowed: " + this.borrowScratchSurfaceReason);
            }

            if (this.document.getWidth() !== this.scratchSurface.getWidth()
                || this.document.getHeight() !== this.scratchSurface.getHeight()) {
                this.scratchSurface.dispose();
                this.scratchSurface = null;
            }
        }

        if (this.scratchSurface === null) {
            // Tools repeatedly read this immutable working copy to restore dirty
            // regions while previewing strokes and transforms. Mark only this
            // canvas for readback; document/layer canvases remain GPU accelerated.
            this.scratchSurface = Surface.create(
                this.document.getWidth(), this.document.getHeight(),
                {willReadFrequently: true}
            );
        }
    }

    onLayerRemoving(index) {
        // Let's pick a new layer to be active
        let layers = this.document.getLayers();
        let newLayerIndex = index === 0 ? index + 1 : index - 1;

        if (newLayerIndex >= 0 && newLayerIndex < layers.getLayerCount()) {
            this.setActiveLayer(layers.getAt(newLayerIndex));
        } else {
            if (layers.getLayerCount() === 0) {
                this.setActiveLayer(null);
            } else {
                this.setActiveLayer(layers.getAt(0));
            }
        }
    }

    onLayerInserted(index) {
        let layer = this.document.getLayers().getAt(index);
        if (layer === null) {
            throw new Error("Inserted layer at index " + index + " does not exist");
        }
        this.activeLayer = layer;
    }

    onLayersChanged() {
        this.app.fire("document:layers_changed", this);
    }

    executeFunction(historyFunction) {
        let result;
        try {
            let memento = historyFunction.execute(this);

            if (memento !== null) {
                this.history.pushNewMemento(memento);
            }

            result = HistoryFunctionResult.SUCCESS;

            // TODO handle out of memory
        } catch (e) {
            result = HistoryFunctionResult.NON_FATAL_ERROR;
            throw e; // TODO log instead in future
        }
        return result;
    }

    performAction(action) {
        let memento = action.performAction(this);
        if (memento !== null) {
            this.history.pushNewMemento(memento);
        }
    }

    borrowScratchSurface(reason) {
        if (this.isScratchSurfaceBorrowed) {
            throw new Error("scratchSurface is already borrowed: " + this.borrowScratchSurfaceReason);
        }

        this.isScratchSurfaceBorrowed = true;
        this.borrowScratchSurfaceReason = reason;

        return this.scratchSurface;
    }

    returnScratchSurface() {
        if (!this.isScratchSurfaceBorrowed) {
            throw new Error("scratchSurface is not borrowed");
        }

        this.isScratchSurfaceBorrowed = false;
        this.borrowScratchSurfaceReason = null;
    }

    getFriendlyName() {
        return this.fileName === null
            ? i18n("untitled.friendlyName")
            : this.fileName;
    }

    getFilePath() {
        return this.filePath;
    }

    isDirty() {
        return this.dirty;
    }

    setDirty(dirty) {
        if (this.dirty === dirty) return;
        this.dirty = dirty;
        this.app.fire("document:dirty_changed", this);
        this.app.updateTitle();
    }

    setFileInfo(fileName, fileHandle = null, filePath = null, fileFormat = null, saveOptions = null) {
        this.fileName = fileName;
        this.filePath = filePath;
        this.fileHandle = fileHandle;
        this.fileFormat = fileFormat;
        this.saveOptions = saveOptions;
        this.app.fire("document:file_changed", this);
        this.app.updateTitle();
    }

    getActiveLayer() {
        return this.activeLayer;
    }

    getHistory() {
        return this.history;
    }

    getActiveLayerIndex() {
        if (this.activeLayer === null || this.activeLayer === undefined) {
            throw new Error("No active layer");
        }

        let index = this.document.getLayers().indexOf(this.activeLayer);
        if (index === -1) {
            let layers = this.document.getLayers();
            if (layers.size() === 0) {
                throw new Error("No layers in document");
            }
            let msg = "Active layer \"" + this.activeLayer.properties.name + "\" not in document: ";
            for (let layer of layers.list()) {
                msg += "\"" + layer.properties.name + "\", ";
            }
            throw new Error(msg);
        }
        return index;
    }

    setActiveLayer(layer) {
        if (this.activeLayer === layer) return;
        this.activeLayer = layer;
        this.app.fire("document:active_layer_changed", this, layer);
    }

    setDocumentAndActiveLayer(document, activeLayer) {
        if (document.getLayers().indexOf(activeLayer) === -1) {
            throw new Error("The active layer must belong to the new document");
        }

        const activeLayerChanged = this.activeLayer !== activeLayer;

        // DocumentView emits document:changed from setDocument(). Assign the
        // matching active layer immediately after the document reference is
        // replaced, before any observer can inspect the new workspace state.
        super.setDocument(document, () => {
            this.activeLayer = activeLayer;
        });

        if (activeLayerChanged) {
            this.app.fire("document:active_layer_changed", this, activeLayer);
        }
    }

    setActiveLayerIndex(index) {
        this.setActiveLayer(this.document.getLayers().getAt(index));
    }

    getSelection() {
        return this.selection;
    }

    getSelectionRenderer() {
        return this.selectionRenderer;
    }

    isGridVisible() {
        return this.gridVisible;
    }

    setGridVisible(visible) {
        this.gridVisible = !!visible;
        this.gridRenderer.setVisible(this.gridVisible);
    }

    isRulersVisible() {
        return this.rulersVisible;
    }

    setRulersVisible(visible) {
        this.rulersVisible = !!visible;
    }
}
