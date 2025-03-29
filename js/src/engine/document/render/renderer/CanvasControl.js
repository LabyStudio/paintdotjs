class CanvasControl extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);

        this.location = null;
        this.size = null;
        this.cursor = null;
    }

    getLocation() {
        return this.location;
    }

    setLocation(location) {
        if (this.location !== location) {
            this.location = location;

            // TODO notify?
        }
    }

    setAngle(angle) {
        this.angle = angle;

        // TODO notify?
    }

}