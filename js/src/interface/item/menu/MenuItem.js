class MenuItem extends Item {

    constructor(id, callback) {
        super(id, callback);
    }

    buildElement() {
        let element = document.createElement("div");
        element.className = "menu-item";
        element.innerHTML = i18n(this.id + ".text");
        return element;
    }
}