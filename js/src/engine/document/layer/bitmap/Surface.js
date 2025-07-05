class Surface {

    constructor(canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Expected an HTMLCanvasElement");
        }

        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        this.context = canvas.getContext('2d', {
            alpha: true,
            willReadFrequently: true,
            imageSmoothingEnabled: false
        });

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

    copySurfaceRectangle(source, sourceRoi) {
        if (this.canvas === null || source.canvas === null) {
            throw new Error("Cannot copy surface: one of the surfaces is disposed.");
        }

        sourceRoi.intersect(source.getBounds());
        let copiedWidth = Math.min(this.width, sourceRoi.width);
        let copiedHeight = Math.min(this.height, sourceRoi.height);

        if (copiedWidth === 0 || copiedHeight === 0) {
            return;
        }

        let src = source.createWindowFromRectangle(sourceRoi);
        this.copySurface(src);
    }

    copySurface(source) {
        if (this.canvas === null || source.canvas === null) {
            throw new Error("Cannot copy surface: one of the surfaces is disposed.");
        }

        this.context.drawImage(
            source.canvas,
            0, 0, source.width, source.height,
            0, 0, this.width, this.height
        );
    }

    createWindowFromRectangle(rectangle) {
        return this.createWindow(
            rectangle.x, rectangle.y,
            rectangle.width, rectangle.height
        );
    }

    createWindow(x, y, windowWidth, windowHeight) {
        if (this.canvas === null) {
            throw new Error("Cannot create window: surface is disposed.");
        }

        if (windowHeight <= 0) {
            throw new Error("windowHeight must be greater than zero");
        }

        let original = this.getBounds();
        let sub = new Rectangle(x, y, windowWidth, windowHeight);
        let clipped = Rectangle.intersect(original, sub);

        if (clipped === null || clipped.width <= 0 || clipped.height <= 0) {
            throw new Error(`bounds parameters must be a subset of this Surface's bounds: ${JSON.stringify(sub)}`);
        }

        let surface = Surface.create(windowWidth, windowHeight);
        // "Copy memory block" equivalent in canvas context
        surface.context.drawImage(
            this.canvas,
            clipped.x, clipped.y, clipped.width, clipped.height,
            0, 0, windowWidth, windowHeight
        );
        return surface;
    }

    getColorAt(x, y) {
        if (x < 0 || x >= this.width) {
            throw new Error(`x=${x} is out of bounds of [0, ${this.width})`);
        }

        if (y < 0 || y >= this.height) {
            throw new Error(`y=${y} is out of bounds of [0, ${this.height})`);
        }

        let imageData = this.context.getImageData(x, y, 1, 1);
        return new Color(imageData.r, imageData.g, imageData.b, imageData.a);
    }

    setColorAt(x, y, color) {
        if (x < 0 || x >= this.width) {
            throw new Error(`x=${x} is out of bounds of [0, ${this.width})`);
        }

        if (y < 0 || y >= this.height) {
            throw new Error(`y=${y} is out of bounds of [0, ${this.height})`);
        }

        let imageData = this.context.getImageData(x, y, 1, 1);
        imageData.data[0] = color.r;
        imageData.data[1] = color.g;
        imageData.data[2] = color.b;
        imageData.data[3] = color.a;
        this.context.putImageData(imageData, x, y);
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

    getBounds() {
        return new Rectangle(0, 0, this.width, this.height);
    }

    dispose() {
        this.canvas = null;
        this.context = null;
        this.checkerboard = null;
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