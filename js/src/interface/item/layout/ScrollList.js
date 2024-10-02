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
        requestAnimationFrame(() => {
            this.element.scrollTop = this.scrollSession.getScrollPosition();
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