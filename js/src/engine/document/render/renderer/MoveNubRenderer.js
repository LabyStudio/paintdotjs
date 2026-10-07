class MoveNubRenderer extends CanvasControl {

    constructor(surfaceBox) {
        super(surfaceBox);

        this.shape = MoveNubShape.SQUARE;
        this.transform = new Matrix();
        this.transform.reset();
        this.transformAngle = 0;
        this.alpha = 255;
        this.size = new Size(5, 5);
        this.hitTestPadding = 8;
    }

    render(destination, renderBounds) {
        super.render(destination, renderBounds);

        let ourSize = Math.min(this.size.getWidth(), this.size.getHeight());

        const context = destination.getContext();
        let surface = this.surfaceBox.getSurface();

        let scaleX = renderBounds.getWidth() / surface.getWidth();
        let scaleY = renderBounds.getHeight() / surface.getHeight();

        let point = this.getTransformedLocation();
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

    getTransformedLocation() {
        return Utility.transformOnePoint(this.transform, this.location);
    }

    getOurRectangle(pad = false) {
        const center = this.getTransformedLocation();
        const zoom = Math.max(0.0001, this.surfaceBox.getScaleFactorRatio());
        const paintedRadius = Math.min(this.size.getWidth(), this.size.getHeight()) - 1;
        const radius = (paintedRadius + (pad ? this.hitTestPadding : 0)) / zoom;
        const rect = new Rectangle(center.getX(), center.getY(), 0, 0);
        rect.inflate(radius, radius);
        return rect;
    }

    isPointTouching(point, pad) {
        const center = this.getTransformedLocation();
        const zoom = Math.max(0.0001, this.surfaceBox.getScaleFactorRatio());
        const paintedRadius = Math.min(this.size.getWidth(), this.size.getHeight()) - 1;
        // Paint.NET 5's TransformControl uses 8 device-independent pixels of
        // hit-test padding around each painted handle.
        const radius = (paintedRadius + (pad ? this.hitTestPadding : 0)) / zoom;
        const dx = point.getX() - center.getX();
        const dy = point.getY() - center.getY();
        return dx * dx + dy * dy <= radius * radius;
    }

    getShape() {
        return this.shape;
    }

    setShape(shape) {
        this.shape = shape;

        // TODO notify?
    }

    setHitTestPadding(padding) {
        this.hitTestPadding = Math.max(0, Number(padding) || 0);
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
