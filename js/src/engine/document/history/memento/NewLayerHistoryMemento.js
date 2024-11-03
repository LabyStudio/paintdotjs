class NewLayerHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace, layerIndex) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.layerIndex = layerIndex
    }

    onUndo() {
        let memento = new DeleteLayerHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.documentWorkspace.getDocument().getLayers().getAt(this.layerIndex)
        );
        memento.setId(this.getId());

        let document = this.documentWorkspace.getDocument();
        document.getLayers().removeLayerAt(this.layerIndex);
        document.invalidate();

        return memento;
    }
}