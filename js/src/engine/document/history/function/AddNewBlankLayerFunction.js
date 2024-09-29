class AddNewBlankLayerFunction extends HistoryFunction {

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let layers = document.getLayers();
        let name = i18n("addNewBlankLayer.layerName.format", layers.size() + 1);
        let newLayer = Layer.createLayer(documentWorkspace.getApp(), document.width, document.height, name);

        let newLayerIndex = documentWorkspace.getActiveLayerIndex() + 1;

        let memento = new NewLayerHistoryMemento(
            i18n("addNewBlankLayer.historyMementoName"),
            "assets/icons/menu_layers_add_new_layer_icon.png",
            documentWorkspace,
            newLayerIndex
        )

        layers.insertLayerAt(newLayerIndex, newLayer);

        return memento;
    }

}