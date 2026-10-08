/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

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

            const delta = (event.deltaY !== 0 ? event.deltaY : event.deltaX) * this.scrollSpeed;
            const position = this.getScrollPosition();
            const viewportSize = this.orientation === ScrollOrientation.HORIZONTAL
                ? this.element.clientWidth
                : this.element.clientHeight;
            const contentSize = this.orientation === ScrollOrientation.HORIZONTAL
                ? this.element.scrollWidth
                : this.element.scrollHeight;
            if (position + delta < 0 || position + viewportSize + delta > contentSize) {
                return;
            }

            event.preventDefault();
            scroll.scrollBy(this.orientation === ScrollOrientation.HORIZONTAL
                ? {left: delta, behavior: 'smooth'}
                : {top: delta, behavior: 'smooth'});
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
        if (draggingItem !== null) {
            this.updateDraggingVisual(draggingItem, this.scrollSession.getLastPointerCoordinate());
        }

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
        const coordinate = this.getPointerCoordinate(event);
        const itemStart = this.orientation === ScrollOrientation.HORIZONTAL ? bounds.left : bounds.top;
        this.scrollSession.setDraggingItem(item);
        this.scrollSession.beginPointerDrag(this, event.pointerId, coordinate - itemStart, coordinate);
        this.updateDraggingVisual(item, coordinate);
        if (this.selectedItem !== item) this.setSelected(item);
        event.preventDefault();
    }

    continuePointerDrag(event) {
        const item = this.getCurrentDraggingItem();
        if (item === null) return this.stopPointerDrag();
        if ((event.buttons & 1) === 0) return this.stopPointerDrag();

        const coordinate = this.getPointerCoordinate(event);
        const previousCoordinate = this.scrollSession.getLastPointerCoordinate();
        this.scrollSession.setLastPointerCoordinate(coordinate);
        this.updateDraggingVisual(item, coordinate);
        this.autoScrollDuringDrag(coordinate);
        if (Math.abs(coordinate - this.scrollSession.dragStartPointerCoordinate) < 4) return;
        if (this.scrollSession.dragSwapPending) return;

        const index = this.items.indexOf(item);
        let target = null;
        if (coordinate < previousCoordinate && index > 0) {
            const previous = this.items[index - 1];
            const bounds = previous.getElement().getBoundingClientRect();
            const middle = this.orientation === ScrollOrientation.HORIZONTAL
                ? bounds.left + bounds.width / 2
                : bounds.top + bounds.height / 2;
            if (coordinate < middle) target = previous;
        } else if (coordinate > previousCoordinate && index < this.items.length - 1) {
            const next = this.items[index + 1];
            const bounds = next.getElement().getBoundingClientRect();
            const middle = this.orientation === ScrollOrientation.HORIZONTAL
                ? bounds.left + bounds.width / 2
                : bounds.top + bounds.height / 2;
            if (coordinate > middle) target = next;
        }
        if (target !== null) {
            this.scrollSession.dragSwapPending = true;
            this.itemSwapper(item, target);
        }
        event.preventDefault();
    }

    getPointerCoordinate(event) {
        return this.orientation === ScrollOrientation.HORIZONTAL ? event.clientX : event.clientY;
    }

    updateDraggingVisual(item, coordinate) {
        const element = item.getElement();
        item.setClassName("dragging-item", true);
        element.style.zIndex = "3";
        element.style.transition = "none";
        element.style.transform = "";
        const bounds = element.getBoundingClientRect();
        const start = this.orientation === ScrollOrientation.HORIZONTAL ? bounds.left : bounds.top;
        const offset = coordinate - start - this.scrollSession.dragGrabOffset;
        element.style.transform = this.orientation === ScrollOrientation.HORIZONTAL
            ? "translateX(" + offset + "px)"
            : "translateY(" + offset + "px)";
    }

    autoScrollDuringDrag(coordinate) {
        const bounds = this.element.getBoundingClientRect();
        const start = this.orientation === ScrollOrientation.HORIZONTAL ? bounds.left : bounds.top;
        const end = this.orientation === ScrollOrientation.HORIZONTAL ? bounds.right : bounds.bottom;
        const size = this.orientation === ScrollOrientation.HORIZONTAL ? bounds.width : bounds.height;
        const edge = Math.min(32, size / 4);
        let amount = 0;
        if (coordinate < start + edge) amount = -Math.min(14, (start + edge - coordinate) * 0.45);
        if (coordinate > end - edge) amount = Math.min(14, (coordinate - end + edge) * 0.45);
        if (amount === 0) return;
        if (this.orientation === ScrollOrientation.HORIZONTAL) {
            this.element.scrollLeft += amount;
        } else {
            this.element.scrollTop += amount;
        }
        this.scrollSession.setScrollPosition(this.getScrollPosition());
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
        if (this.orientation === ScrollOrientation.HORIZONTAL) {
            this.element.scrollLeft = this.scrollSession.getScrollPosition();
        } else {
            this.element.scrollTop = this.scrollSession.getScrollPosition();
        }

        // Animate the changes of the item positions
        for (let item of this.items) {
            if (typeof item.getKey !== 'function') {
                console.error("Item does not have a getKey function");
                continue;
            }

            let key = item.getKey(); // Use key because the instance of the item may change
            let currentItemPosition = this.orientation === ScrollOrientation.HORIZONTAL
                ? item.element.offsetLeft
                : item.element.offsetTop;

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
                    const from = this.orientation === ScrollOrientation.HORIZONTAL
                        ? {left: -diff + "px"}
                        : {top: -diff + "px"};
                    const to = this.orientation === ScrollOrientation.HORIZONTAL ? {left: 0} : {top: 0};
                    item.element.animate([from, to], {
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
        if (this.element === null) return this.scrollSession.getScrollPosition();
        return this.orientation === ScrollOrientation.HORIZONTAL
            ? this.element.scrollLeft
            : this.element.scrollTop;
    }

    setScrollPosition(scrollPosition) {
        this.scrollSession.setScrollPosition(scrollPosition);

        if (this.isInitialized()) {
            if (this.orientation === ScrollOrientation.HORIZONTAL) {
                this.element.scrollLeft = scrollPosition;
            } else {
                this.element.scrollTop = scrollPosition;
            }
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

                const position = this.orientation === ScrollOrientation.HORIZONTAL
                    ? itemByKey.element.offsetLeft - this.element.clientWidth / 2 + itemByKey.element.clientWidth / 2
                    : itemByKey.element.offsetTop - this.element.clientHeight / 2 + itemByKey.element.clientHeight / 2;
                this.element.scrollTo(this.orientation === ScrollOrientation.HORIZONTAL
                    ? {left: position, behavior: 'smooth'}
                    : {top: position, behavior: 'smooth'});
            });
        }
    }

    isItemInViewport(item) {
        let listBounds = this.element.children[0].getBoundingClientRect();
        let itemBounds = item.element.getBoundingClientRect();
        let viewBounds = this.element.getBoundingClientRect();

        const itemStart = this.orientation === ScrollOrientation.HORIZONTAL
            ? itemBounds.left - listBounds.left
            : itemBounds.top - listBounds.top;
        const itemEnd = this.orientation === ScrollOrientation.HORIZONTAL
            ? itemBounds.right - listBounds.left
            : itemBounds.bottom - listBounds.top;
        const viewportSize = this.orientation === ScrollOrientation.HORIZONTAL
            ? viewBounds.width
            : viewBounds.height;
        const scrollPosition = this.scrollSession.getScrollPosition();

        return itemStart >= scrollPosition && itemEnd <= scrollPosition + viewportSize;
    }

    scrollToBottom() {
        if (this.isInitialized()) {
            this.setScrollPosition(this.element.scrollHeight);
        }
    }
}
