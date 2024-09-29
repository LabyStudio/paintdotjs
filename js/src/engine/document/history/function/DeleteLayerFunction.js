class DeleteLayerFunction extends HistoryFunction {

    constructor(layerIndex) {
        super();
        this.layerIndex = layerIndex;
    }

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();

        if (this.layerIndex < 0 || this.layerIndex >= document.getLayers().size()) {
            throw new Error("layerIndex = " + this.layerIndex + ", expected [0, " + document.getLayers().size() + ")");
        }

        let memento = new DeleteLayerHistoryMemento(
            i18n("deleteLayer.historyMementoName"),
            "assets/icons/menu_layers_delete_layer_icon.png",
            documentWorkspace,
            document.getLayers().getAt(this.layerIndex)
        );

        document.getLayers().removeLayerAt(this.layerIndex);

        return memento;
    }

}