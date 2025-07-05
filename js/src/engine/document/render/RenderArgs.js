class RenderArgs {

    constructor(surface) {
        this.surface = surface;
    }

    getSurface() {
        return this.surface;
    }

    dispose() {
        // Note: We are not disposing the surface
    }
}