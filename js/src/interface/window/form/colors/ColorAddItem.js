class ColorAddItem extends IconItem {

    constructor() {
        super("colorAdd", _ => {
        });

        this.withIconPathKey("color_add_overlay", true);
    }

    buildElement() {
        let element = super.buildElement();
        {
            let colorElement = document.createElement("div");
            colorElement.classList.add("color");
            colorElement.style.backgroundColor = "white";
            element.appendChild(colorElement);
        }
        return element;
    }
}