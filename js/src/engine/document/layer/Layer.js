class Layer {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.properties = new LayerProperties(null, true, false, 255);
        this.invalidated = new EventHandler();
    }

    render(renderArgs, rectangle) {
        throw new Error("Not implemented");
    }

    invalidate() {
        this.invalidated.fire();
    }

    renderRegion(renderArgs, region) {
        for (let rectangle of region.rectangles) {
            this.render(renderArgs, rectangle);
        }
    }

    isVisible() {
        return this.properties.visible;
    }

    setVisible(visible) {
        this.properties.visible = visible;
        this.invalidate();
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getBounds() {
        return new Rectangle(0, 0, this.width, this.height);
    }

    getProperties() {
        return this.properties;
    }

    clone() {
        throw new Error("Not implemented");
    }

    static createLayer(documentWorkspace, width, height, name) {
        let layer = new BitmapLayer(documentWorkspace, width, height);
        layer.properties.name = name;
        layer.properties.isBackground = false;
        return layer;
    }

    static createBackgroundLayer(documentWorkspace, width, height) {
        let layer = new BitmapLayer(documentWorkspace, width, height, Color.WHITE);
        layer.properties.name = i18n("layer.backgroundLayer.defaultName");
        layer.properties.isBackground = true;
        return layer;
    }

}