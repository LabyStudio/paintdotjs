class DropMenuItem extends MenuItem {

    constructor(id, entries = []) {
        super(id, () => {
            if (this.isEnabled() && !this.isOpen()) {
                this.open();
            }
        });

        this.openMenu = false;
        this.entries = entries;
    }

    initialize(parent) {
        super.initialize(parent);

        this.setEnabled(this.entries.length > 0);

        for (let entry of this.entries) {
            entry.initialize(this);
        }
    }

    add(entry) {
        this.entries.push(entry);
        entry.initialize(this);
    }

    remove(entry) {
        let index = this.entries.indexOf(entry);
        if (index !== -1) {
            this.entries.splice(index, 1);
        }
    }

    open() {
        let dropMenu = document.createElement("div");
        dropMenu.className = "drop-menu";
        for (let entry of this.entries) {
            dropMenu.appendChild(entry.getElement());
        }
        document.body.appendChild(dropMenu);
        this.openMenu = true;

        // Set drop position
        let elementBounds = this.element.getBoundingClientRect();
        dropMenu.style.left = this.element.offsetLeft
            + (elementBounds.right > window.innerWidth / 2 ? -this.element.offsetWidth * 2 : 0)
            + "px";
        dropMenu.style.top = elementBounds.top
            + (this.isDropUp() ? -dropMenu.offsetHeight : this.element.offsetHeight)
            + "px";

        this.element.setAttribute("active", "");

        // Register close listener
        setTimeout(_ => {
            document.addEventListener("click", () => {
                this.close();
            }, {once: true});
        })
    }

    close() {
        let dropMenu = document.querySelector(".drop-menu");
        if (dropMenu) {
            dropMenu.remove();
        }
        this.openMenu = false;

        this.element.removeAttribute("active");
    }

    isDropUp() {
        return this.element !== null && this.isDropUpAt(this.element.getBoundingClientRect());
    }

    isDropUpAt(bounds) {
        return bounds.top + bounds.height > window.innerHeight;
    }

    isOpen() {
        return this.openMenu;
    }

    get(id) {
        return this.entries.find(e => e.id === id);
    }
}