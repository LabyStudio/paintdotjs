class SwapLayerHistoryMemento extends HistoryMemento {

    constructor(
        name,
        image,
        documentWorkspace,
        layerIndex1,
        layerIndex2
    ) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.layerIndex1 = layerIndex1;
        this.layerIndex2 = layerIndex2;

        if (this.layerIndex1 < 0 || this.layerIndex2 < 0
            || this.layerIndex1 >= this.documentWorkspace.getDocument().getLayers().size()
            || this.layerIndex2 >= this.documentWorkspace.getDocument().getLayers().size()) {
            throw new Error("layerIndex[1|2] out of range");
        }
    }

    onUndo() {
        let memento = new SwapLayerHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.layerIndex2,
            this.layerIndex1
        );

        let layers = this.documentWorkspace.getDocument().getLayers();
        let layer1 = layers.getAt(this.layerIndex1);
        let layer2 = layers.getAt(this.layerIndex2);

        let firstIndex = Math.min(this.layerIndex1, this.layerIndex2);
        let secondIndex = Math.max(this.layerIndex1, this.layerIndex2);

        if (secondIndex - firstIndex === 1) {
            layers.removeLayerAt(this.layerIndex1);
            layers.insertLayerAt(this.layerIndex2, layer1);
        } else {
            layers.setLayerAt(this.layerIndex1, layer2);
            layers.setLayerAt(this.layerIndex2, layer1);
        }

        layer1.invalidate();
        layer2.invalidate();

        return memento;
    }
}