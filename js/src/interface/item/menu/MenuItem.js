class MenuItem extends Item {

    constructor(id, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let element = document.createElement("div");
        element.className = "menu-item";
        element.id = this.id;
        if (this.isClickable()) {
            element.className += " clickable";
        }
        element.innerHTML = this.getText();
        return element;
    }

    getText() {
        return i18n(this.id + ".text");
    }
}