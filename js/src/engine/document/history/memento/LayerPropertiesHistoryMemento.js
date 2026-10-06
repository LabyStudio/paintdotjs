class LayerPropertiesHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace, layerIndex) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.layerIndex = layerIndex;
        this.properties = documentWorkspace.getDocument().getLayers()
            .getAt(layerIndex).properties.clone();
    }

    onUndo() {
        const redo = new LayerPropertiesHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.layerIndex
        );
        const layer = this.documentWorkspace.getDocument().getLayers().getAt(this.layerIndex);
        layer.properties = this.properties.clone();
        layer.invalidate();
        this.documentWorkspace.getApp().fire("document:layer_properties_changed", layer);
        return redo;
    }
}
