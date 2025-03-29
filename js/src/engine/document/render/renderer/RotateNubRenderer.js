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
}