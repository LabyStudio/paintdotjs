class NullHistoryMemento extends HistoryMemento {

    constructor(name, image) {
        super(name, image);
    }

    onUndo() {
        throw new Error("NullHistoryMementos are not undoable");
    }

}