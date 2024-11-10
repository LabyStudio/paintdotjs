class SurfaceBoxRenderer {

    constructor(surfaceBox) {
        this.surfaceBox = surfaceBox;
        this.visible = true;
    }

    render(destination, renderBounds) {

    }

    isVisible() {
        return this.visible;
    }

    setVisible(visible) {
        this.visible = visible;
    }

}