class BitmapLayer extends Layer {

    constructor(app, width, height, fillColor = Color.WHITE) {
        super(width, height);

        this.app = app;

        this.surface = new Surface(width, height);
        this.surface.clear(fillColor);
    }

    render(renderArgs, rectangle) {
        // TODO render rows individually
        this.surface.render(renderArgs, rectangle);

        // Fire event
        this.app.fire("document:render_layer_region", this, rectangle);
    }

}