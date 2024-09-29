class Document {

    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Bind event handlers
        this.onLayerInvalidated = this.onLayerInvalidated.bind(this);

        this.layers = new LayerList(this);
        this.layers.changing.add(() => {
            for (let layer of this.layers.layers) {
                layer.invalidated.remove(this.onLayerInvalidated);
            }
        });
        this.layers.changed.add(() => {
            for (let layer of this.layers.layers) {
                layer.invalidated.add(this.onLayerInvalidated);
            }
            this.invalidate();
        });

        this.invalidated = new EventHandler();

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

    invalidate(rectangle = Rectangle.relative(0, 0, this.width, this.height)) {
        // Invalidate whole document
        this.updateRegion = [];
        this.updateRegion.push(rectangle);

        // Fire event
        this.invalidated.fire(this, rectangle);
    }

    onLayerInvalidated(layer, rectangle) {
        this.invalidate(rectangle);
    }

    renderRegion(renderArgs, region) {
        // Clear region
        for (let rectangle of region.rectangles) {
            renderArgs.surface.context.clearRect(
                rectangle.x,
                rectangle.y,
                rectangle.width,
                rectangle.height,
            );
        }

        // Render layers
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