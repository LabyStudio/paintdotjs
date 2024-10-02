class ScrollSession {

    constructor() {
        this.scrollPosition = 0;
        this.itemPositionCache = new Map();
        this.lastAnimationFrames = new Map();
    }

    getScrollPosition() {
        return this.scrollPosition;
    }

    setScrollPosition(scrollPosition) {
        this.scrollPosition = scrollPosition;
    }

    cacheItemPosition(itemKey, position) {
        this.itemPositionCache.set(itemKey, position);
    }

    getItemPosition(itemKey) {
        if (!this.itemPositionCache.has(itemKey)) {
            return null;
        }
        return this.itemPositionCache.get(itemKey);
    }

    removeItemPosition(itemKey) {
        this.itemPositionCache.delete(itemKey);
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