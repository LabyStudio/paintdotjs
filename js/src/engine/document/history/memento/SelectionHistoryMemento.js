class SelectionHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.savedSelectionData = documentWorkspace.getSelection().save();
    }

    onUndo() {
        let memento = new SelectionHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace
        );
        this.documentWorkspace.getSelection().restore(this.savedSelectionData);

        return memento;
    }
}