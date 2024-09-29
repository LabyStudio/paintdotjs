class UIElement {

    constructor(id) {
        this.id = id;
        this.parent = null;
        this.app = app;
    }

    initialize(parent) {
        this.parent = parent;
    }

    appendTo(element, parent) {
        this.initialize(parent);
        element.appendChild(this.getElement());
    }

    getElement() {
        throw new Error("Not implemented for " + this.constructor.name);
    }

}