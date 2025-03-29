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

    getOurRectangle() {
        let ptFs = [this.location];
        this.transform.transformPoints(ptFs);
        let ratio = Math.ceil(1.0 / this.surfaceBox.getScaleFactorRatio());

        let ourWidth = this.size.getWidth();
        let ourHeight = this.size.getHeight();

        if (!isNaN(ratio)) {
            let rect = new Rectangle(ptFs[0].getX(), ptFs[0].getY(), 0, 0);
            rect.inflate(ratio * ourWidth, ratio * ourHeight);
            return rect;
        } else {
            return Rectangle.empty();
        }
    }

    isPointTouching(point, pad) {
        let rect = this.getOurRectangle();

        if (pad) {
            let padding = 2.0 / this.surfaceBox.getScaleFactorRatio();
            rect.inflate(padding + 1.0, padding + 1.0);
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