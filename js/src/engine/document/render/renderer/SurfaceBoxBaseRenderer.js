class SurfaceBoxBaseRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);
    }

    render(destination, renderBounds) {
        let surface = this.surfaceBox.getSurface();
        if (surface === null) {
            return;
        }

        // Clear view
        destination.clear();

        // Render transparent background pattern
        destination.renderCheckerboard(
            renderBounds.getX(),
            renderBounds.getY(),
            renderBounds.getWidth(),
            renderBounds.getHeight()
        );

        // Render the composition of the active document workspace
        ImageUtil.drawImage(
            destination.getContext(),
            surface.getCanvas(),
            0,
            0,
            surface.getWidth(),
            surface.getHeight(),
            renderBounds.getX(),
            renderBounds.getY(),
            renderBounds.getWidth(),
            renderBounds.getHeight()
        );
    }
}