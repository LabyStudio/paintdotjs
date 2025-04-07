class MoveNubRenderer extends CanvasControl {

    constructor(surfaceBox) {
        super(surfaceBox);

        this.shape = MoveNubShape.SQUARE;
        this.transform = new Matrix();
        this.transform.reset();
        this.transformAngle = 0;
        this.alpha = 255;
        this.size = new Size(5, 5);
    }

    render(destination, renderBounds) {
        super.render(destination, renderBounds);

        let ourSize = Math.min(this.size.getWidth(), this.size.getHeight());

        const context = destination.getContext();
        let surface = this.surfaceBox.getSurface();

        let scaleX = renderBounds.getWidth() / surface.getWidth();
        let scaleY = renderBounds.getHeight() / surface.getHeight();

        let point = Utility.transformOnePoint(this.transform, this.location);
        let x = renderBounds.getX() + point.getX() * scaleX;
        let y = renderBounds.getY() + point.getY() * scaleY;


        // Draw circle
        if (this.shape === MoveNubShape.CIRCLE || this.shape === MoveNubShape.SQUARE) {
            context.save();
            this.drawCircle(context, x, y, ourSize - 1, "white");
            this.drawCircle(context, x, y, ourSize - 2, "black");
            this.drawCircle(context, x, y, ourSize - 3, "white");
            context.restore();
        }
    }

    drawCircle(context, x, y, radius, color) {
        context.strokeStyle = color;
        context.beginPath();
        context.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );
        context.stroke();
    }

    getOurRectangle() {
        let ptFs = Utility.transformOnePoint(this.transform, this.location);

        let ourWidth = this.size.getWidth();
        let ourHeight = this.size.getHeight();

        let rect = new Rectangle(ptFs.getX(), ptFs.getY(), 0, 0);
        rect.inflate(ourWidth, ourHeight);
        return rect;
    }

    isPointTouching(point, pad) {
        let rect = this.getOurRectangle();

        if (pad) {
            let padding = 2.0 / this.surfaceBox.getScaleFactorRatio();
            rect.scale(padding, padding);
        }

        return rect.contains(point);
    }

    getShape() {
        return this.shape;
    }

    setShape(shape) {
        this.shape = shape;

        // TODO notify?
    }

    setTransform(transform) {
        if (transform == null) {
            throw new Error("transform");
        }

        this.transform = transform.clone();
        this.transformAngle = Utility.getAngleOfTransform(this.transform);

        // TODO notify?
    }
}

class MoveNubShape {
    static SQUARE = 0;
    static COMPASS = 1;
    static CIRCLE = 2;
}