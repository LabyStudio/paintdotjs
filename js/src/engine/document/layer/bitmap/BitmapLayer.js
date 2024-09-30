class BitmapLayer extends Layer {

    constructor(app, width, height, fillColor = null) {
        super(width, height);

        this.app = app;

        this.surface = new Surface(width, height);
        if (fillColor !== null) {
            this.surface.clear(fillColor);
        }
    }

    render(renderArgs, rectangle) {
        // TODO render rows individually
        this.surface.render(renderArgs, rectangle);

        // Fire event
        this.app.fire("document:render_layer_region", this, rectangle);
    }

    clone() {
        let layer = new BitmapLayer(this.app, this.width, this.height);
        layer.surface = this.surface.clone();
        layer.properties = this.properties.clone();
        return layer;
    }

    getSurface() {
        return this.surface;
    }

}