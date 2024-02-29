class Item extends UIElement {

    constructor(id, callback) {
        super(id);
        this.callback = callback;
    }

    initialize(parent) {
        super.initialize(parent);
        this.element = this.buildElement();

        let isImplemented = this.callback !== null;
        if (!isImplemented) {
            this.element.setAttribute("title", "Not implemented");
        }
        this.setEnabled(isImplemented);

        this.element.onclick = () => {
            if (this.callback !== null) {
                this.callback();
            }
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.element.removeAttribute("disabled");
        } else {
            this.element.setAttribute("disabled", "")
        }
    }

    isEnabled() {
        return this.enabled;
    }

    getElement() {
        return this.element;
    }

    buildElement() {
    }

    updateParent(parent) {
        this.parent = parent;
    }
}