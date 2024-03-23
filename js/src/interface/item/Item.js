class Item extends UIElement {

    constructor(id, callback = null) {
        super(id);
        this.callback = callback;
        this.enabled = this.isImplemented();
        this.element = null;
    }

    initialize(parent) {
        super.initialize(parent);
        this.element = this.buildElement();

        if (!this.isImplemented()) {
            this.element.setAttribute("title", "Not implemented");
        }

        // Update enabled state on element
        this.setEnabled(this.enabled);

        this.element.onclick = e => {
            this.run();

            if (!this.isClickable()) {
                e.stopPropagation();
            }
        }
    }

    updateDocument() {
        if (this.element === null || this.element.parentElement === null) {
            return;
        }

        let parent = this.element.parentElement;
        let previousElement = this.element;
        parent.replaceChild(this.element = this.buildElement(), previousElement);
        this.element.onclick = previousElement.onclick;
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
        return !this.isClickable() || this.callback !== null;
    }

    isEnabled() {
        return this.enabled;
    }

    getElement() {
        return this.element;
    }

    buildElement() {
    }

    isClickable() {
        return true;
    }

    updateParent(parent) {
        this.parent = parent;
    }
}