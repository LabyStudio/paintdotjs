class HorizontalSeparator extends UIElement {

    constructor() {
        super("horizontal-separator");
        this.element = document.createElement("div");
        this.element.className = "horizontal-separator";
    }

    getElement() {
        return this.element;
    }
}