class BitmapLayer extends Layer {

    constructor(width, height, fillColor = Color.WHITE) {
        super(width, height);

        this.surface = new Surface(width, height);
        this.surface.clear(fillColor);
    }

    render(renderArgs, rectangle) {
        // TODO render rows individually
        this.surface.render(renderArgs, rectangle);
    }

}