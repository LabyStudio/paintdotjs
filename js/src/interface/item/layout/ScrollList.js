class ScrollList extends Item {

    constructor(id, scrollSession) {
        super(id);

        this.items = [];
        this.selectedItem = null;
        this.selectCallback = null;
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
                    this.selectedItem = item;
                    if (this.selectCallback !== null) {
                        this.selectCallback(item);
                    }
                    this.reinitialize();
                });
                item.appendTo(element, this);
            }

            scroll.appendChild(element);
        }
        return scroll;
    }

    postInitialize() {
        // Set the scroll position
        this.element.scrollTop = this.scrollSession.getScrollPosition();

        // Animate the changes of the item positions
        this.scrollSession.debounce("postInitialize", () => {
            // Set the scroll position again in case it has changed
            this.element.scrollTop = this.scrollSession.getScrollPosition();

            // Animate the changes of the item positions
            for (let item of this.items) {
                if (typeof item.getKey !== 'function') {
                    console.error("Item does not have a getKey function");
                    continue;
                }
                let key = item.getKey();
                let currentItemPosition = item.element.offsetTop;

                // Check if the item position has changed
                let prevItemPosition = this.scrollSession.getItemPosition(key);
                if (prevItemPosition !== null) {
                    let diff = currentItemPosition - prevItemPosition;
                    if (Math.abs(diff) <= 1) {
                        continue;
                    }

                    // Animate the item to its new position
                    item.element.style.position = "relative";
                    item.element.animate([
                        {top: -diff + "px"},
                        {top: 0}
                    ], {
                        duration: 200,
                        easing: "ease-out"
                    });
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
        });
    }

    add(item) {
        this.items.push(item);
    }

    addAt(index, item) {
        this.items.splice(index, 0, item);
    }

    setSelected(item) {
        this.selectedItem = item;
        this.reinitialize();
    }

    setSelectCallback(callback) {
        this.selectCallback = callback;
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
        this.scrollToItem(this.selectedItem);
    }

    scrollToItem(item) {
        if (this.isInitialized()) {
            requestAnimationFrame(() => {
                this.element.scrollTo({
                    top: item.element.offsetTop - this.element.clientHeight / 2 + item.element.clientHeight / 2,
                    behavior: 'smooth'
                });
            });
        }
    }
}