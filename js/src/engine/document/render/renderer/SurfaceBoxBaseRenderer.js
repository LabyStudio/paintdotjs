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

        const context = destination.getContext();
        const dropShadow = typeof AppSettingsStore === "undefined"
            || AppSettingsStore.get("canvas.dropShadow", true);
        context.save();
        if (dropShadow) {
            context.shadowColor = "rgba(0, 0, 0, .62)";
            context.shadowBlur = 10;
            context.shadowOffsetX = 3;
            context.shadowOffsetY = 4;
        }

        // Render transparent background pattern. Drawing the shadow with this
        // rectangle keeps it behind the image instead of tinting image pixels.
        destination.renderCheckerboard(
            renderBounds.getX(),
            renderBounds.getY(),
            renderBounds.getWidth(),
            renderBounds.getHeight()
        );
        context.restore();

        // Render the composition of the active document workspace
        const activeWorkspace = this.surfaceBox.getApp().getActiveDocumentWorkspace();
        const revision = activeWorkspace === null
            ? 0 : activeWorkspace.getCompositionRevision();
        ImageUtil.drawViewportImage(
            context,
            surface.getCanvas(),
            0,
            0,
            surface.getWidth(),
            surface.getHeight(),
            renderBounds.getX(),
            renderBounds.getY(),
            renderBounds.getWidth(),
            renderBounds.getHeight(),
            revision
        );

        if (typeof AppSettingsStore !== "undefined"
            && AppSettingsStore.get("canvas.customBorder", false)) {
            context.save();
            context.strokeStyle = AppSettingsStore.get("canvas.borderColor", "#808080");
            context.lineWidth = 1;
            context.strokeRect(
                renderBounds.getX() + .5,
                renderBounds.getY() + .5,
                Math.max(0, renderBounds.getWidth() - 1),
                Math.max(0, renderBounds.getHeight() - 1)
            );
            context.restore();
        }
    }
}
