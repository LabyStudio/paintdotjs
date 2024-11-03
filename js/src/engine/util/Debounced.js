class Debounced {

    constructor() {
        this.lastAnimationFrames = new Map();
    }

    debounce(id, callback) {
        if (this.lastAnimationFrames.has(id)) {
            cancelAnimationFrame(this.lastAnimationFrames.get(id));
        }
        this.lastAnimationFrames.set(id, requestAnimationFrame(() => {
            this.lastAnimationFrames.delete(id);
            callback();
        }));
    }

}