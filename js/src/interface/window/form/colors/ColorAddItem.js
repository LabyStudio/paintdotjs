class ColorAddItem extends IconItem {

    constructor() {
        super("colorAdd", _ => {
        });

        this.colorElement = null;

        this.withIconPathKey("color_add_overlay", true);
    }

    buildElement() {
        let element = super.buildElement();
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
}