class VerticalSeparator extends UIElement {

    constructor() {
        super("vertical-separator");
        this.element = document.createElement("div");
        this.element.className = "vertical-separator";
    }

    getElement() {
        return this.element;
    }
}