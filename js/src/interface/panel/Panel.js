class Panel extends UIElement {

    constructor(elementId) {
        super(elementId);

        this.element = document.getElementById(elementId);
        if (this.element == null) {
            throw new Error("Element with id \'" + elementId + "\' not found");
        }
    }

}