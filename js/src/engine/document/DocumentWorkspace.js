class DocumentWorkspace extends DocumentView {

    constructor(app) {
        super(app);

        this.filePath = null;
        this.activeLayer = null;
        this.history = new HistoryStack(app, this);
        this.selection = new Selection();

        this.selectionRenderer = new SelectionRenderer(this.surfaceBox, this.selection);
        this.selectionRenderer.setSelectionOutline(true);
        this.selectionRenderer.setSelectionTinting(false);
        this.selectionRenderer.setOutlineAnimation(true);
        this.surfaceBox.addRenderer(this.selectionRenderer);

        // Bind instance methods
        this.onLayerRemoving = this.onLayerRemoving.bind(this);
        this.onLayerInserted = this.onLayerInserted.bind(this);
    }

    onDocumentChanging() {
        super.onDocumentChanging();

        // Remove event handlers from old document
        if (this.document !== null) {
            this.document.getLayers().removingAt.remove(this.onLayerRemoving);
            this.document.getLayers().insertedAt.remove(this.onLayerInserted);
        }
    }

    onDocumentChanged() {
        super.onDocumentChanged();

        // Add event handlers to new document
        this.document.getLayers().removingAt.add(this.onLayerRemoving);
        this.document.getLayers().insertedAt.add(this.onLayerInserted);
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

    getFriendlyName() {
        return this.filePath === null
            ? i18n("untitled.friendlyName")
            : this.filePath; // TODO: get file name from path
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
        this.activeLayer = layer;
    }

    setActiveLayerIndex(index) {
        this.activeLayer = this.document.getLayers().getAt(index);
    }

    getSelection() {
        return this.selection;
    }

    getSelectionRenderer() {
        return this.selectionRenderer;
    }
}