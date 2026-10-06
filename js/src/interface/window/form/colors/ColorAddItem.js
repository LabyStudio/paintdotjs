class ColorAddItem extends IconItem {

    constructor() {
        super("colorAdd", _ => {
            this.parent.toggleColorAddMode();
        });

        this.colorElement = null;

        this.withIconPathKey("color_add_overlay", true);
    }

    buildElement() {
        let element = super.buildElement();
        element.title = "Add Color to Palette";
        {
            this.colorElement = document.createElement("div");
            this.colorElement.classList.add("color");
            element.appendChild(this.colorElement);
        }
        return element;
    }

    setColor(color) {
        this.colorElement.style.backgroundColor = color.toHex();
    }

    setChecked(checked) {
        this.setActive(checked);
        if (this.element !== null) this.element.setAttribute("aria-pressed", checked ? "true" : "false");
    }
}
