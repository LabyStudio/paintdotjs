class Debounced {

    constructor() {
        this.lastAnimationFrames = new Map();
        this.lastTimeouts = new Map();
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

    debounceTimeout(id, delay, callback) {
        if (this.lastTimeouts.has(id)) {
            clearTimeout(this.lastTimeouts.get(id));
        }
        this.lastTimeouts.set(id, setTimeout(() => {
            this.lastTimeouts.delete(id);
            callback();
        }, delay));
    }

}
