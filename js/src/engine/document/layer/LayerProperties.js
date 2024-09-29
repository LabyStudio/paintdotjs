class LayerProperties {

    constructor(name, visible, isBackground, opacity) {
        this.name = name;
        this.visible = visible;
        this.isBackground = isBackground;
        this.opacity = opacity;
    }

    clone() {
        return new LayerProperties(
            this.name,
            this.visible,
            this.isBackground,
            this.opacity
        );
    }
}