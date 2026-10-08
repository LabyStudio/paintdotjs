/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

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
            // Paint.NET's BackgroundCanvasLayer uses a symmetric Gaussian
            // shadow with a 3 DIP outset and a 1.5 DIP inset. There is no
            // directional offset; the combined radius is only 4.5 DIPs.
            context.shadowColor = "rgba(0, 0, 0, .5)";
            context.shadowBlur = 4.5;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
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

        // Paint.NET draws a one-device-pixel neutral hairline on the exact
        // canvas boundary. Without it, a reduced image exposes the outermost
        // checkerboard samples and looks like it has a transparent fringe.
        const customBorder = typeof AppSettingsStore !== "undefined"
            && AppSettingsStore.get("canvas.customBorder", false);
        const transform = context.getTransform();
        const displayScale = Math.max(1, Math.abs(transform.a), Math.abs(transform.d));
        const lineWidth = 1 / displayScale;
        context.save();
        context.strokeStyle = customBorder
            ? AppSettingsStore.get("canvas.borderColor", "#808080")
            : getComputedStyle(document.documentElement)
                .getPropertyValue("--canvas-outline-color").trim() || "#505050";
        context.lineWidth = lineWidth;
        context.strokeRect(
            renderBounds.getX(),
            renderBounds.getY(),
            renderBounds.getWidth(),
            renderBounds.getHeight()
        );
        context.restore();
    }
}
