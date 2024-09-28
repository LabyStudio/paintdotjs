class Layer {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.properties = new LayerProperties(null, true, false, 255);
    }

    render(renderArgs, rectangle) {
        throw new Error("Not implemented");
    }

    invalidate() {
        // TODO fire event
    }

    renderRegion(renderArgs, region) {
        for (let rectangle of region.rectangles) {
            this.render(renderArgs, rectangle);
        }
    }

    isVisible() {
        return this.properties.visible;
    }

    static createLayer(app, width, height, name) {
        let layer = new BitmapLayer(app, width, height, Color.TRANSPARENT);
        layer.properties.name = name;
        layer.properties.isBackground = false;
        return layer;
    }

    static createBackgroundLayer(app, width, height) {
        let layer = new BitmapLayer(app, width, height, Color.WHITE);
        layer.properties.name = i18n("layer.backgroundLayer.defaultName");
        layer.properties.isBackground = true;
        return layer;
    }

}