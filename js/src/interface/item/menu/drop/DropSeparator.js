class DropSeparator extends UIElement {

    constructor() {
        super("drop-separator");
        this.element = document.createElement("div");
        this.element.className = "drop-separator";
    }

    getElement() {
        return this.element;
    }
}