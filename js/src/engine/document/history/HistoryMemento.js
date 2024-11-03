class HistoryMemento {

    static nextId = 0;

    constructor(name, image) {
        this.name = name;
        this.image = image;
        this.data = null;

        this.id = HistoryMemento.nextId++;
    }

    onUndo() {
        throw new Error("Not implemented");
    }

    performUndo() {
        let memento = this.onUndo();
        memento.setId(this.getId());
        return memento;
    }

    getName() {
        return this.name;
    }

    getImage() {
        return this.image;
    }

    getId() {
        return this.id;
    }

    setId(id) {
        this.id = id;
    }

}