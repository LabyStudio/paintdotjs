/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class MoveNubRenderer extends CanvasControl {

    static compassRadius = 7;

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


        if (this.shape === MoveNubShape.COMPASS) {
            this.drawCompass(context, x, y);
        } else if (this.shape === MoveNubShape.CIRCLE || this.shape === MoveNubShape.SQUARE) {
            context.save();
            this.drawCircle(context, x, y, ourSize - 1, "white");
            this.drawCircle(context, x, y, ourSize - 2, "black");
            this.drawCircle(context, x, y, ourSize - 3, "white");
            context.restore();
        }
    }

    drawCompass(context, x, y) {
        const radius = MoveNubRenderer.compassRadius;
        const inner = radius - 3.5;
        const narrow = 0.5;
        const shoulder = 2;

        context.save();
        context.fillStyle = "white";
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        context.strokeRect(x - radius + 0.5, y - radius + 0.5,
            radius * 2 - 1, radius * 2 - 1);

        context.fillStyle = "black";
        context.beginPath();
        context.moveTo(x - radius, y);
        context.lineTo(x - inner, y + shoulder);
        context.lineTo(x - inner, y + narrow);
        context.lineTo(x - narrow, y + narrow);
        context.lineTo(x - narrow, y + inner);
        context.lineTo(x - shoulder, y + inner);
        context.lineTo(x, y + radius);
        context.lineTo(x + shoulder, y + inner);
        context.lineTo(x + narrow, y + inner);
        context.lineTo(x + narrow, y + narrow);
        context.lineTo(x + inner, y + narrow);
        context.lineTo(x + inner, y + shoulder);
        context.lineTo(x + radius, y);
        context.lineTo(x + inner, y - shoulder);
        context.lineTo(x + inner, y - narrow);
        context.lineTo(x + narrow, y - narrow);
        context.lineTo(x + narrow, y - inner);
        context.lineTo(x + shoulder, y - inner);
        context.lineTo(x, y - radius);
        context.lineTo(x - shoulder, y - inner);
        context.lineTo(x - narrow, y - inner);
        context.lineTo(x - narrow, y - narrow);
        context.lineTo(x - inner, y - narrow);
        context.lineTo(x - inner, y - shoulder);
        context.closePath();
        context.fill();
        context.restore();
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
        const paintedRadius = this.getPaintedRadius();
        const radius = (paintedRadius + (pad ? this.hitTestPadding : 0)) / zoom;
        const rect = new Rectangle(center.getX(), center.getY(), 0, 0);
        rect.inflate(radius, radius);
        return rect;
    }

    isPointTouching(point, pad) {
        const center = this.getTransformedLocation();
        const zoom = Math.max(0.0001, this.surfaceBox.getScaleFactorRatio());
        const paintedRadius = this.getPaintedRadius();
        // Paint.NET 5's TransformControl uses 8 device-independent pixels of
        // hit-test padding around each painted handle.
        const radius = (paintedRadius + (pad ? this.hitTestPadding : 0)) / zoom;
        const dx = point.getX() - center.getX();
        const dy = point.getY() - center.getY();
        if (this.shape === MoveNubShape.COMPASS) {
            return Math.abs(dx) <= radius && Math.abs(dy) <= radius;
        }
        return dx * dx + dy * dy <= radius * radius;
    }

    getPaintedRadius() {
        return this.shape === MoveNubShape.COMPASS
            ? MoveNubRenderer.compassRadius
            : Math.min(this.size.getWidth(), this.size.getHeight()) - 1;
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
