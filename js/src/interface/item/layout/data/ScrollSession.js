class ScrollSession extends Debounced {

    constructor() {
        super();
        this.scrollPosition = 0;
        this.itemPositionCache = new Map();
        this.draggingItem = null;
        this.lastClientY = 0;
    }

    getScrollPosition() {
        return this.scrollPosition;
    }

    setScrollPosition(scrollPosition) {
        this.scrollPosition = scrollPosition;
    }

    setDraggingItem(item) {
        this.draggingItem = item;
    }

    getDraggingItem() {
        return this.draggingItem;
    }

    setLastClientY(clientY) {
        this.lastClientY = clientY;
    }

    getLastClientY() {
        return this.lastClientY;
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
}