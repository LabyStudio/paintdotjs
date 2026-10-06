class ScrollList extends Item {

    constructor(orientation, id, scrollSession) {
        super(id);

        this.orientation = orientation;

        this.items = [];
        this.selectedItem = null;
        this.selectCallback = null;
        this.itemSwapper = null; // this.itemSwapper(item1, item2)
        this.enabled = true;

        this.scrollSession = scrollSession;
        this.timeLastScrolled = 0;
        this.scrollSpeed = 1.0;

        this.test = 0;
    }

    buildElement() {
        // Scroll
        let scroll = document.createElement("div");
        scroll.id = this.id;
        scroll.className = "scroll-list scroll-list-" + (this.orientation === ScrollOrientation.HORIZONTAL ? "horizontal" : "vertical");
        scroll.addEventListener("scroll", event => {
            this.scrollSession.setScrollPosition(this.getScrollPosition());
        });
        scroll.addEventListener('wheel', event => {
            if (Date.now() - this.timeLastScrolled < 100 || this.scrollSpeed === 1) {
                return;
            }
            this.timeLastScrolled = Date.now();

            // Check if it would hit the top or bottom and then return
            let wouldHitTop = this.element.scrollTop + event.deltaY * this.scrollSpeed < 0;
            let wouldHitBottom = this.element.scrollTop + this.element.clientHeight
                + event.deltaY * this.scrollSpeed > this.element.scrollHeight;
            if (wouldHitTop || wouldHitBottom) {
                return;
            }

            event.preventDefault();
            scroll.scrollBy({
                top: event.deltaY * this.scrollSpeed,
                behavior: 'smooth'
            });
        });
        {
            // Content
            let element = document.createElement("div");
            element.className = "scroll-content";

            for (let item of this.items) {
                // Set the selected item to the first item if it is not set
                if (this.selectedItem === null) {
                    this.selectedItem = item;
                }

                item.setClassName("selected-item", this.selectedItem === item);
                item.addClassName("scroll-item");
                if (this.orientation === ScrollOrientation.HORIZONTAL) {
                    item.addClassName("horizontal-scroll-item");
                } else {
                    item.addClassName("vertical-scroll-item");
                }

                // Layer item
                item.setPressable(() => {
                    this.setSelected(item);
                });
                item.appendTo(element, this);
            }

            scroll.appendChild(element);
        }

        return scroll;
    }

    initializeDragAndDrop() {
        this.scrollSession.setDragOwner(this);
        this.scrollSession.dragSwapPending = false;
        const draggingItem = this.getCurrentDraggingItem();
        if (draggingItem !== null) this.updateDraggingVisual(draggingItem, this.scrollSession.getLastClientY());

        for (let item of this.items) {
            const element = item.getElement();
            element.addEventListener("pointerdown", event => {
                if (event.button !== 0 || event.target.closest("input, button") !== null) return;
                this.startPointerDrag(item, event);
            });
        }
    }

    getCurrentDraggingItem() {
        const draggingItem = this.scrollSession.getDraggingItem();
        if (draggingItem === null) return null;
        return this.items.find(item => item.getKey() === draggingItem.getKey()) || null;
    }

    startPointerDrag(item, event) {
        if (this.itemSwapper === null) return;
        const bounds = item.getElement().getBoundingClientRect();
        this.scrollSession.setDraggingItem(item);
        this.scrollSession.beginPointerDrag(this, event.pointerId, event.clientY - bounds.top, event.clientY);
        this.updateDraggingVisual(item, event.clientY);
        if (this.selectedItem !== item) this.setSelected(item);
        event.preventDefault();
    }

    continuePointerDrag(event) {
        const item = this.getCurrentDraggingItem();
        if (item === null) return this.stopPointerDrag();
        if ((event.buttons & 1) === 0) return this.stopPointerDrag();

        const previousY = this.scrollSession.getLastClientY();
        this.scrollSession.setLastClientY(event.clientY);
        this.updateDraggingVisual(item, event.clientY);
        this.autoScrollDuringDrag(event.clientY);
        if (Math.abs(event.clientY - this.scrollSession.dragStartClientY) < 4) return;
        if (this.scrollSession.dragSwapPending) return;

        const index = this.items.indexOf(item);
        let target = null;
        if (event.clientY < previousY && index > 0) {
            const previous = this.items[index - 1];
            const bounds = previous.getElement().getBoundingClientRect();
            if (event.clientY < bounds.top + bounds.height / 2) target = previous;
        } else if (event.clientY > previousY && index < this.items.length - 1) {
            const next = this.items[index + 1];
            const bounds = next.getElement().getBoundingClientRect();
            if (event.clientY > bounds.top + bounds.height / 2) target = next;
        }
        if (target !== null) {
            this.scrollSession.dragSwapPending = true;
            this.itemSwapper(item, target);
        }
        event.preventDefault();
    }

    updateDraggingVisual(item, clientY) {
        const element = item.getElement();
        item.setClassName("dragging-item", true);
        element.style.zIndex = "3";
        element.style.transition = "none";
        element.style.transform = "";
        const top = element.getBoundingClientRect().top;
        element.style.transform = "translateY(" +
            (clientY - top - this.scrollSession.dragGrabOffset) + "px)";
    }

    autoScrollDuringDrag(clientY) {
        const bounds = this.element.getBoundingClientRect();
        const edge = Math.min(32, bounds.height / 4);
        let amount = 0;
        if (clientY < bounds.top + edge) amount = -Math.min(14, (bounds.top + edge - clientY) * 0.45);
        if (clientY > bounds.bottom - edge) amount = Math.min(14, (clientY - bounds.bottom + edge) * 0.45);
        if (amount === 0) return;
        this.element.scrollTop += amount;
        this.scrollSession.setScrollPosition(this.element.scrollTop);
    }

    stopPointerDrag() {
        const item = this.getCurrentDraggingItem();
        if (item !== null) {
            const element = item.getElement();
            element.style.transform = "";
            element.style.transition = "";
            element.style.zIndex = "";
            item.setClassName("dragging-item", false);
        }
        this.scrollSession.setDraggingItem(null);
        this.scrollSession.endPointerDrag();
    }

    postInitialize() {
        // Set the scroll position again in case it has changed
        this.element.scrollTop = this.scrollSession.getScrollPosition();

        // Animate the changes of the item positions
        for (let item of this.items) {
            if (typeof item.getKey !== 'function') {
                console.error("Item does not have a getKey function");
                continue;
            }

            let key = item.getKey(); // Use key because the instance of the item may change
            let currentItemPosition = item.element.offsetTop;

            // Check if the item position has changed
            let prevItemPosition = this.scrollSession.getItemPosition(key);
            if (prevItemPosition !== null) {
                let diff = currentItemPosition - prevItemPosition;
                if (Math.abs(diff) <= 1) {
                    continue;
                }

                // Don't animate the dragging item
                let draggingItem = this.scrollSession.getDraggingItem();
                let isDraggingItem = draggingItem !== null && item.getKey() === draggingItem.getKey();

                // Animate the item to its new position
                if (!isDraggingItem) {
                    item.element.style.position = "relative";
                    item.element.animate([
                        {top: -diff + "px"},
                        {top: 0}
                    ], {
                        duration: 140,
                        easing: "cubic-bezier(.2,.8,.2,1)"
                    });
                }
            }
            this.scrollSession.cacheItemPosition(key, currentItemPosition);
        }

        // Remove unused item positions
        let itemKeys = this.items.map(item => item.getKey());
        for (let key of this.scrollSession.itemPositionCache.keys()) {
            if (!itemKeys.includes(key)) {
                this.scrollSession.removeItemPosition(key);
            }
        }

        // Initialize drag and drop for item swapping
        this.initializeDragAndDrop();
    }

    add(item) {
        this.items.push(item);
    }

    addAt(index, item) {
        this.items.splice(index, 0, item);
    }

    setSelected(item, silent = false) {
        if (item !== this.selectedItem) {
            this.selectedItem = item;
            if (!silent && this.selectCallback !== null) {
                this.selectCallback(item);
            }
            this.reinitialize();
        }
    }

    setSelectCallback(callback) {
        this.selectCallback = callback;
    }

    setItemSwapper(itemSwapper) {
        this.itemSwapper = itemSwapper;
    }

    isImplemented() {
        return true;
    }

    getScrollPosition() {
        return this.element === null ? this.scrollSession.getScrollPosition() : this.element.scrollTop;
    }

    setScrollPosition(scrollPosition) {
        this.scrollSession.setScrollPosition(scrollPosition);

        if (this.isInitialized()) {
            this.element.scrollTop = scrollPosition;
        }
    }

    setScrollSpeed(scrollSpeed) {
        this.scrollSpeed = scrollSpeed;
    }

    scrollToSelected() {
        if (this.selectedItem === null) {
            return;
        }
        this.scrollToItem(this.selectedItem);
    }

    scrollToItem(item) {
        if (this.isInitialized()) {
            this.scrollSession.debounce("scrollToItem", () => {
                if (item.getKey === undefined) {
                    console.error("Item does not have a getKey function");
                    return;
                }
                // Use key because the instance of the item may change
                let itemByKey = this.items.find(i => i.getKey() === item.getKey());
                if (this.isItemInViewport(itemByKey)) {
                    return;
                }

                let position = itemByKey.element.offsetTop - this.element.clientHeight / 2 + itemByKey.element.clientHeight / 2;
                this.element.scrollTo({
                    top: position,
                    behavior: 'smooth'
                });
            });
        }
    }

    isItemInViewport(item) {
        let listBounds = this.element.children[0].getBoundingClientRect();
        let itemBounds = item.element.getBoundingClientRect();
        let viewBounds = this.element.getBoundingClientRect();

        let relItemTopY = itemBounds.top - listBounds.top;
        let relItemBottomY = itemBounds.bottom - listBounds.top;

        let scrollPosition = this.scrollSession.getScrollPosition();

        return relItemTopY >= scrollPosition && relItemBottomY <= scrollPosition + viewBounds.height;
    }

    scrollToBottom() {
        if (this.isInitialized()) {
            this.setScrollPosition(this.element.scrollHeight);
        }
    }
}
