class DuplicateLayerFunction extends HistoryFunction {

    constructor(layerIndex) {
        super();
        this.layerIndex = layerIndex;
    }

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let layers = document.getLayers();

        if (this.layerIndex < 0 || this.layerIndex >= layers.size()) {
            throw new Error("layerIndex = " + this.layerIndex + ", expected [0, " + layers.size() + ")");
        }

        // Duplicate the active layer
        let newLayer = documentWorkspace.getActiveLayer().clone();
        newLayer.getProperties().isBackground = false;
        let newLayerIndex = this.layerIndex + 1;

        let memento = new NewLayerHistoryMemento(
            i18n("duplicateLayer.historyMementoName"),
            "assets/icons/menu_layers_duplicate_layer_icon.png",
            documentWorkspace,
            this.layerIndex
        );

        layers.insertLayerAt(newLayerIndex, newLayer);
        newLayer.invalidate();

        return memento;
    }

}