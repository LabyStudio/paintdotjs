class DeleteLayerHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace, deleteMe) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.index = documentWorkspace.getDocument().getLayers().indexOf(deleteMe);
        this.data = new DeleteLayerHistoryMementoData(deleteMe);
    }

    onUndo() {
        let memento = new NewLayerHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.index
        );

        let layers = this.documentWorkspace.getDocument().getLayers();
        layers.insertLayer(this.index, this.data.getLayer());
        layers.getAt(this.index).invalidate();

        return memento;
    }


}