class ScrollSession extends Debounced {

    constructor() {
        super();
        this.scrollPosition = 0;
        this.itemPositionCache = new Map();
        this.draggingItem = null;
        this.lastPointerCoordinate = 0;
        this.dragOwner = null;
        this.dragPointerId = null;
        this.dragGrabOffset = 0;
        this.dragStartPointerCoordinate = 0;
        this.dragSwapPending = false;
        this.dragMoveHandler = null;
        this.dragEndHandler = null;
        this.dragBlurHandler = null;
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

    setLastPointerCoordinate(coordinate) {
        this.lastPointerCoordinate = coordinate;
    }

    getLastPointerCoordinate() {
        return this.lastPointerCoordinate;
    }

    setDragOwner(owner) {
        this.dragOwner = owner;
    }

    beginPointerDrag(owner, pointerId, grabOffset, pointerCoordinate) {
        this.endPointerDrag();
        this.dragOwner = owner;
        this.dragPointerId = pointerId;
        this.dragGrabOffset = grabOffset;
        this.dragStartPointerCoordinate = pointerCoordinate;
        this.dragSwapPending = false;
        this.lastPointerCoordinate = pointerCoordinate;
        this.dragMoveHandler = event => {
            if (event.pointerId === this.dragPointerId) this.dragOwner?.continuePointerDrag(event);
        };
        this.dragEndHandler = event => {
            if (event.pointerId === this.dragPointerId) this.dragOwner?.stopPointerDrag();
        };
        this.dragBlurHandler = () => this.dragOwner?.stopPointerDrag();
        document.addEventListener("pointermove", this.dragMoveHandler, true);
        document.addEventListener("pointerup", this.dragEndHandler, true);
        document.addEventListener("pointercancel", this.dragEndHandler, true);
        window.addEventListener("blur", this.dragBlurHandler);
    }

    endPointerDrag() {
        if (this.dragMoveHandler !== null) {
            document.removeEventListener("pointermove", this.dragMoveHandler, true);
            document.removeEventListener("pointerup", this.dragEndHandler, true);
            document.removeEventListener("pointercancel", this.dragEndHandler, true);
            window.removeEventListener("blur", this.dragBlurHandler);
        }
        this.dragMoveHandler = null;
        this.dragEndHandler = null;
        this.dragBlurHandler = null;
        this.dragPointerId = null;
        this.dragOwner = null;
        this.dragSwapPending = false;
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
