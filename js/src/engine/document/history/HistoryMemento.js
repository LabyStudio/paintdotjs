class HistoryMemento {

    constructor(name, image) {
        this.name = name;
        this.image = image;
        this.data = null;
    }

    onUndo() {
        throw new Error("Not implemented");
    }

    PerformUndo() {
        return this.onUndo();
    }

}