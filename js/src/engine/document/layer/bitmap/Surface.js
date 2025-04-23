class Surface {

    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        this.context = canvas.getContext('2d');
        this.context.imageSmoothingEnabled = false;

        this.checkerboard = null;
    }

    clear(color = null) {
        this.clearRegion(0, 0, this.width, this.height, color);
    }

    clearRegion(x, y, width, height, color = null) {
        this.context.clearRect(x, y, width, height);

        if (color !== null) {
            this.context.fillStyle = color.toHex();
            this.context.fillRect(x, y, width, height);
        }
    }

    render(renderArgs, rectangle) {
        // Render surface to renderArgs.surface
        let targetSurface = renderArgs.getSurface();
        targetSurface.context.drawImage(
            this.canvas,
            rectangle.x,
            rectangle.y,
            rectangle.width, rectangle.height,
            rectangle.x, rectangle.y,
            rectangle.width, rectangle.height
        );
    }

    clone() {
        let surface = Surface.create(this.width, this.height);
        surface.context.drawImage(this.canvas, 0, 0);
        return surface;
    }

    renderCheckerboard(x, y, width, height) {
        if (this.checkerboard === null) {
            this.checkerboard = ImageUtil.createTransparentPattern(this.context, 5);
        }

        this.context.fillStyle = this.checkerboard;
        this.context.fillRect(x, y, width, height);
    }

    copySurface(source) {
        let sourceWidth = source.getWidth();
        let sourceHeight = source.getHeight();

        this.context.drawImage(
            source.getCanvas(),
            0, 0, sourceWidth, sourceHeight,
            0, 0, sourceWidth, sourceHeight
        );
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.context;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    setWidth(width) {
        this.width = width;
        this.canvas.width = width;
    }

    setHeight(height) {
        this.height = height;
        this.canvas.height = height;
    }

    static fromCanvas(canvas) {
        let context = canvas.getContext('2d');
        return new Surface(canvas, context);
    }

    static create(width, height) {
        let canvas = document.createElement('canvas');
        let surface = new Surface(canvas);
        surface.setWidth(width);
        surface.setHeight(height);
        return surface;
    }
}