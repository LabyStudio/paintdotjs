class SwapLayerFunction extends HistoryFunction {

    constructor(index1, index2) {
        super();
        this.index1 = index1;
        this.index2 = index2;
    }

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let layers = document.getLayers();

        if (this.index1 < 0 || this.index1 >= layers.size() ||
            this.index2 < 0 || this.index2 >= layers.size()) {
            throw new Error("index1 = " + this.index1 + ", index2 = " + this.index2 + ", expected [0," + layers.size() + ")");
        }

        let memento = new SwapLayerHistoryMemento(
            i18n("swapLayerFunction.Name"),
            "assets/icons/menu_layers_move_layer_up_icon.png",
            documentWorkspace,
            this.index1,
            this.index2
        );

        let layer1 = layers.getAt(this.index1);
        let layer2 = layers.getAt(this.index2);

        layers.setLayerAt(this.index1, layer2);
        layers.setLayerAt(this.index2, layer1);

        layer1.invalidate();
        layer2.invalidate();

        return memento;
    }

}