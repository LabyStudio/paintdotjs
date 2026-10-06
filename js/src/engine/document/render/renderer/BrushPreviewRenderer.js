class BrushPreviewRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);
        this.location = null;
        this.diameter = 1;
        this.shape = "circle";
        this.alpha = 1;
    }

    setPreview(location, diameter, shape = "circle", alpha = 1) {
        this.location = location === null ? null : location.clone();
        this.diameter = Math.max(1, Number(diameter));
        this.shape = shape;
        this.alpha = Utility.clamp(Number(alpha), 0, 1);
        this.setVisible(this.location !== null);
    }

    render(destination, renderBounds) {
        super.render(destination, renderBounds);
        if (this.location === null) return;
        const surface = this.surfaceBox.getSurface();
        if (surface === null) return;

        const scaleX = renderBounds.getWidth() / surface.getWidth();
        const scaleY = renderBounds.getHeight() / surface.getHeight();
        const centerX = renderBounds.getX() + (this.location.x + 0.5) * scaleX;
        const centerY = renderBounds.getY() + (this.location.y + 0.5) * scaleY;
        const width = Math.max(1, this.diameter * scaleX);
        const height = Math.max(1, this.diameter * scaleY);
        const context = destination.getContext();

        const traceGeometry = () => {
            context.beginPath();
            if (this.shape === "square") {
                context.rect(centerX - width / 2, centerY - height / 2, width, height);
            } else {
                context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
            }
        };

        context.save();
        context.globalAlpha = this.alpha;
        // Paint.NET's brush handle uses a contrasting geometry outline so it
        // remains visible over both light and dark pixels.
        traceGeometry();
        context.lineWidth = 3;
        context.strokeStyle = "rgba(255,255,255,0.9)";
        context.stroke();
        traceGeometry();
        context.lineWidth = 1;
        context.strokeStyle = "rgba(0,0,0,0.95)";
        context.stroke();
        context.restore();
    }
}
