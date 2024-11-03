class ScrollList extends Item {

    constructor(id, scrollSession) {
        super(id);

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
        scroll.className = "scroll-list";
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
        let timeContinuedDragging = 0;
        let dragging = false;

        let startDraggingItem = (item) => {
            // Start dragging the item if the item swapper is available
            if (this.itemSwapper === null) {
                return;
            }

            let element = item.getElement();

            // Reset the transform before calculating the new position
            element.style.transform = "translate(0, 0)";
            element.style.zIndex = "1";

            timeContinuedDragging = Date.now();
            dragging = true;
            item.setClassName("dragging-item", true);
            this.scrollSession.setDraggingItem(item);
        }

        let dragItem = (item, event) => {
            let element = item.getElement();

            // Important: Reset the transform before calculating the new position
            element.style.transform = "translate(0, 0)";

            // Calculate the new position of the item
            let offsetY = event.clientY - element.getBoundingClientRect().top - element.clientHeight / 2;
            element.style.transform = "translate(0, " + offsetY + "px)";
            this.scrollSession.setLastClientY(event.clientY);

            this.setSelected(item);
            this.scrollToSelected();

            // Cooldown time before swapping the items
            let timePassed = Date.now() - timeContinuedDragging;
            if (timePassed < 200) {
                return
            }

            // Swap the items if the dragged item is moved to another item
            for (let otherItem of this.items) {
                if (otherItem === item) {
                    continue;
                }

                // Figure out if the mouse is over the other item and then swap it
                let otherElement = otherItem.getElement();
                let otherElementTop = otherElement.getBoundingClientRect().top;
                let otherElementHeight = otherElement.getBoundingClientRect().height;
                if (event.clientY > otherElementTop && event.clientY < otherElementTop + otherElementHeight) {
                    this.itemSwapper(item, otherItem);
                    break; // Only swap with one item at a time
                }
            }
        }

        let stopDraggingItem = (item) => {
            let element = item.getElement();
            element.style.transform = "translate(0, 0)";
            element.style.zIndex = "0";

            item.setClassName("dragging-item", false);

            this.scrollSession.setDraggingItem(null);
            dragging = false;
        }

        // Continue dragging the item from the previous instance
        let draggingItem = this.scrollSession.getDraggingItem();
        if (draggingItem !== null && !dragging) {
            let itemByKey = this.items.find(i => i.getKey() === draggingItem.getKey());
            startDraggingItem(itemByKey);

            // We don't have the mouse position yet, so we use the last stored clientY position to place the item at the correct position
            let element = itemByKey.getElement();
            let clientY = this.scrollSession.getLastClientY();
            let offsetY = clientY - element.getBoundingClientRect().top - element.clientHeight / 2;
            element.style.transform = "translate(0, " + offsetY + "px)";
        }

        // Start dragging the item
        for (let item of this.items) {
            let element = item.getElement();
            element.addEventListener("mousedown", event => {
                startDraggingItem(item);
            });
        }

        // Dragging the item
        this.element.addEventListener("mousemove", event => {
            let draggingItem = this.scrollSession.getDraggingItem();
            if (draggingItem !== null) {
                if (event.buttons === 1) {
                    dragItem(draggingItem, event);
                } else {
                    // Make sure it resets when we missed the mouse up event
                    stopDraggingItem(draggingItem);
                }
            }
        });

        // Stop dragging the item
        // TODO Take the mouse up event from the app instead of the scroll list?
        this.element.addEventListener("mouseup", event => {
            let draggingItem = this.scrollSession.getDraggingItem();
            if (draggingItem !== null) {
                stopDraggingItem(draggingItem);
            }
        });
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
                        duration: 200,
                        easing: "ease-out"
                    });
                    this.scrollToSelected();
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