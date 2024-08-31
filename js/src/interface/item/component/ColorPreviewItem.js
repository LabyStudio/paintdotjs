class ColorPreviewItem extends Item {

    constructor(id) {
        super(id);

        this.selected = false;
        this.color = Color.WHITE;
    }

    initialize(parent) {
        super.initialize(parent);
        this.update();
    }

    buildElement() {
        let element = document.createElement("div")
        element.classList.add("color-preview");
        element.id = this.id;
        {
            // Selected indicator
            let indicator = document.createElement("div");
            indicator.classList.add("selected-indicator");
            element.appendChild(indicator);
        }
        return element;
    }

    update() {
        this.element.children[0].style.opacity = this.selected ? "1" : "0";
        this.element.style.backgroundImage = this.selected
            ? 'linear-gradient(#FFF, #FFF)'
            : "linear-gradient(var(--preview-color-opaque), var(--preview-color))";
        this.element.style.setProperty('--indicator-active', this.selected ? "1" : "0");
        this.element.style.setProperty('--preview-color', this.color.toHex());
        this.element.style.setProperty('--preview-color-opaque', this.color.copy().setAlpha(255).toHex());
    }

    setSelected(selected) {
        this.selected = selected;
        this.update();
    }

    setColor(color) {
        this.color = color;
        this.update();
    }

}