class RotateNubRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);

        this.size = 6;
        this.location = new Point(0, 0);
        this.angle = 0;
    }

    getAngle() {
        return this.angle;
    }

    setAngle(angle) {
        this.angle = angle;

        // TODO notify?
    }

    setLocation(location) {
        this.location = location;

        // TODO notify?
    }

    render(destination, renderBounds) {
        super.render(destination, renderBounds);

        const surface = this.surfaceBox.getSurface();
        if (surface === null || this.location === null) return;

        const scaleX = renderBounds.getWidth() / surface.getWidth();
        const scaleY = renderBounds.getHeight() / surface.getHeight();

        // Paint.NET rounds the rotation anchor to a device pixel before
        // drawing it. This keeps the screw lines centered and crisp at every
        // zoom level instead of making the handle appear to wobble.
        const centerX = Math.round(renderBounds.getX() + this.location.getX() * scaleX);
        const centerY = Math.round(renderBounds.getY() + this.location.getY() * scaleY);
        const radius = 4;
        const context = destination.getContext();

        const traceScrew = () => {
            context.beginPath();
            context.arc(0, 0, radius, 0, Math.PI * 2);
            context.moveTo(0.5 - radius, 0);
            context.lineTo(radius - 0.5, 0);
            context.moveTo(0, 0.5 - radius);
            context.lineTo(0, radius - 0.5);
        };

        context.save();
        context.translate(centerX, centerY);
        context.rotate(this.angle * Math.PI / 180);
        context.lineCap = "butt";
        context.lineJoin = "round";

        // This is the v5 ScrewHandleDrawing: a thick white backing stroke
        // followed by a one-pixel black foreground stroke. It stays readable
        // over both light and dark image content.
        traceScrew();
        context.strokeStyle = "white";
        context.lineWidth = 3.5;
        context.stroke();
        traceScrew();
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.stroke();
        context.restore();
    }
}
