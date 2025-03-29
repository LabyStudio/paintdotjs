class CompoundToolHistoryMemento extends ToolHistoryMemento {

    constructor(compoundHistoryMemento, documentWorkspace, name, image) {
        super(documentWorkspace, name, image);

        this.compoundHistoryMemento = compoundHistoryMemento;
    }

    onToolUndo() {
        let compoundHistoryMemento = this.compoundHistoryMemento.performUndo();
        return new CompoundToolHistoryMemento(
            compoundHistoryMemento,
            this.documentWorkspace,
            this.name,
            this.image
        );
    }
}