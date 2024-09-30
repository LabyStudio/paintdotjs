class HistoryMemento {

    constructor(name, image) {
        this.name = name;
        this.image = image;
        this.data = null;
    }

    onUndo() {
        throw new Error("Not implemented");
    }

    performUndo() {
        return this.onUndo();
    }

    getName() {
        return this.name;
    }

    getImage() {
        return this.image;
    }

}