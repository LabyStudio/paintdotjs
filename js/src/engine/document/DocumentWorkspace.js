class DocumentWorkspace extends DocumentView {

    constructor(app) {
        super(app);

        this.filePath = null;
        this.activeLayer = null;
        this.history = new HistoryStack(this);
    }

    executeFunction(historyFunction) {
        let result;
        try {
            let memento = historyFunction.execute(this);
            this.history.pushNewMemento(memento);

            result = HistoryFunctionResult.SUCCESS;

            // TODO handle out of memory
        } catch (e) {
            result = HistoryFunctionResult.NON_FATAL_ERROR;
            throw e; // TODO log instead in future
        }
        return result;
    }

    getFriendlyName() {
        return this.filePath === null
            ? i18n("untitled.friendlyName")
            : this.filePath; // TODO: get file name from path
    }

    getActiveLayer() {
        return this.activeLayer;
    }

    getActiveLayerIndex() {
        let index = this.document.getLayers().indexOf(this.activeLayer);
        if (index === -1) {
            throw new Error("Active layer not in document");
        }
        return index;
    }

    setActiveLayer(layer) {
        this.activeLayer = layer;
    }

    setActiveLayerIndex(index) {
        this.activeLayer = this.document.getLayers().get(index);
    }
}