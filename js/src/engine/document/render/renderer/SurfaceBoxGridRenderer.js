class SurfaceBoxGridRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);
    }

    render(destination, renderBounds) {
        const context = destination.getContext();
        let surface = this.surfaceBox.getSurface();

        let scaleX = renderBounds.getWidth() / surface.getWidth();
        let scaleY = renderBounds.getHeight() / surface.getHeight();
        if (scaleX <= 2 || scaleY <= 2) {
            return;
        }

        context.save();

        let value = scaleX;
        context.lineWidth = value > 100 ? Math.pow(10, (value - 100) / 50) : value / 100;

        // Render grid
        for (let i = 0; i < 2; i++) {
            if (i === 0) {
                context.strokeStyle = "rgba(255, 255, 255, 1)";
            } else {
                context.strokeStyle = "rgba(0, 0, 0, 1)";
                context.setLineDash([1, 1]);
            }

            for (let x = 0; x <= surface.getWidth(); x += 1) {
                context.beginPath();
                context.moveTo(renderBounds.getX() + x * scaleX, renderBounds.getY());
                context.lineTo(renderBounds.getX() + x * scaleX, renderBounds.getY() + renderBounds.getHeight());
                context.stroke();
            }

            for (let y = 0; y <= surface.getHeight(); y += 1) {
                context.beginPath();
                context.moveTo(renderBounds.getX(), renderBounds.getY() + y * scaleY);
                context.lineTo(renderBounds.getX() + renderBounds.getWidth(), renderBounds.getY() + y * scaleY);
                context.stroke();
            }
        }

        context.restore();
    }

}