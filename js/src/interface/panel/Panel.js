class Panel extends UIElement {

    constructor(elementId) {
        super(elementId);

        this.element = document.getElementById(elementId);
        if (this.element == null) {
            this.element = document.createElement("div");
            this.element.id = elementId;
        }
    }

    getElement() {
        return this.element;
    }

}