class Item extends UIElement {

    constructor(id, callback) {
        super(id);
        this.callback = callback;
        this.enabled = this.isImplemented();
    }

    initialize(parent) {
        super.initialize(parent);
        this.element = this.buildElement();

        if (!this.isImplemented()) {
            this.element.setAttribute("title", "Not implemented");
        }

        // Update enabled state on element
        this.setEnabled(this.enabled);

        this.element.onclick = () => {
            this.run();
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

    run() {
        if (this.callback !== null) {
            this.callback();
        }
    }

    isImplemented() {
        return this.callback !== null;
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