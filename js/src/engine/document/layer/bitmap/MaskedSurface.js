class MaskedSurface {

    constructor(surface, region) {
        this.surface = surface;
        this.region = region;
        this.maskedSurface = null;
    }

    render(targetSurface, transform) {

    }

    dispose() {
        if (this.maskedSurface !== null) {
            this.maskedSurface.dispose();
            this.maskedSurface = null;
        }
    }
}