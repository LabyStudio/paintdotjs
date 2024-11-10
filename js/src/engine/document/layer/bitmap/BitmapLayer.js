class BitmapLayer extends Layer {

    constructor(documentWorkspace, width, height, fillColor = null) {
        super(width, height);

        this.documentWorkspace = documentWorkspace;

        this.surface = Surface.create(width, height);
        if (fillColor !== null) {
            this.surface.clear(fillColor);
        }
    }

    render(renderArgs, rectangle) {
        // TODO render rows individually
        this.surface.render(renderArgs, rectangle);

        // Fire event
        let app = this.documentWorkspace.getApp();
        app.fire("document:render_layer_region", this, rectangle);
    }

    clone() {
        let layer = new BitmapLayer(this.documentWorkspace, this.width, this.height);
        layer.surface = this.surface.clone();
        layer.properties = this.properties.clone();
        return layer;
    }

    getSurface() {
        return this.surface;
    }

    getDocumentWorkspace() {
        return this.documentWorkspace;
    }

}