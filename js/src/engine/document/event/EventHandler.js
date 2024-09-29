class EventHandler {

    constructor() {
        this.listeners = [];
    }

    add(listener) {
        this.listeners.push(listener);
    }

    remove(listener) {
        let index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    fire(...args) {
        for (let listener of this.listeners) {
            listener(...args);
        }
    }
}