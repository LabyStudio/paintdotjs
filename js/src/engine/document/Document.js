class Document {

    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.layers = new LayerList(this);

        this.updateRegion = [];
    }

    addLayer(layer) {
        this.layers.layers.push(layer);
    }

    update(renderArgs) {
        let region = new Region(this.updateRegion);
        let updateScansContext = new UpdateScansContext(this, region);
        updateScansContext.update(renderArgs);
    }

    invalidate() {
        // Invalidate whole document
        this.updateRegion = [];
        this.updateRegion.push(Rectangle.relative(0, 0, this.width, this.height));
    }

    renderRegion(renderArgs, region) {
        for (let layer of this.layers.layers) {
            if (!layer.isVisible()) {
                continue;
            }
            layer.renderRegion(renderArgs, region);
        }
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getLayers() {
        return this.layers;
    }
}