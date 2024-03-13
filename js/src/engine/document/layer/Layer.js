class Layer {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.properties = new LayerProperties("Layer", true, false, 255);
    }

    render(rectangle) {
        throw new Error("Not implemented");
    }

    renderRegion(renderArgs, region) {
        for (let rectangle of region.rectangles) {
            this.render(renderArgs, rectangle);
        }
    }

    isVisible() {
        return this.properties.visible;
    }

    static createBackgroundLayer(width, height) {
        let layer = new BitmapLayer(width, height, Color.WHITE);
        layer.name = i18n("layer.background.name");
        layer.properties.isBackground = true;
        return layer;
    }

}