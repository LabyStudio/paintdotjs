class SurfaceBoxRenderer {

    constructor(surfaceBox) {
        this.surfaceBox = surfaceBox;
        this.visible = true;
        this.disposed = false;
    }

    render(destination, renderBounds) {

    }

    isVisible() {
        return this.visible && !this.disposed;
    }

    setVisible(visible) {
        if (this.disposed) {
            throw new Error("SurfaceBoxRenderer is disposed");
        }
        this.visible = visible;
    }

    dispose() {
        this.disposed = true;

        // TODO dispose?
    }

}