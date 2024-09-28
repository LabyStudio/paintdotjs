class MenuItem extends Item {

    constructor(id = null, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let element = document.createElement("div");
        element.className = "menu-item";
        if (this.id !== null) {
            element.id = this.id;
        }
        if (this.isClickable()) {
            element.className += " clickable";
        }
        element.innerHTML = this.getText();
        return element;
    }

    updateText(text = this.getText()) {
        if (this.element === null) {
            return;
        }
        this.element.innerHTML = text;
    }

    getText() {
        return i18n(this.id + ".text");
    }
}