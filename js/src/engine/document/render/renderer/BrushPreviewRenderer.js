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

class BrushPreviewRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);
        this.location = null;
        this.diameter = 1;
        this.shape = "circle";
        this.alpha = 1;
        this.pixelAligned = true;
    }

    setPreview(location, diameter, shape = "circle", alpha = 1, pixelAligned = true) {
        this.location = location === null ? null : location.clone();
        this.diameter = Math.max(1, Number(diameter));
        this.shape = shape;
        this.alpha = Utility.clamp(Number(alpha), 0, 1);
        this.pixelAligned = pixelAligned;
        this.setVisible(this.location !== null);
    }

    render(destination, renderBounds) {
        super.render(destination, renderBounds);
        if (this.location === null) return;
        const surface = this.surfaceBox.getSurface();
        if (surface === null) return;

        const scaleX = renderBounds.getWidth() / surface.getWidth();
        const scaleY = renderBounds.getHeight() / surface.getHeight();
        const coordinateOffset = this.pixelAligned ? 0.5 : 0;
        const centerX = renderBounds.getX() + (this.location.x + coordinateOffset) * scaleX;
        const centerY = renderBounds.getY() + (this.location.y + coordinateOffset) * scaleY;
        const width = Math.max(1, this.diameter * scaleX);
        const height = Math.max(1, this.diameter * scaleY);
        const context = destination.getContext();

        if (this.shape === "square" && this.diameter === 1) {
            // Keep the one document pixel clear and draw Paint.NET's three
            // screen-space outlines around it: black, white, black.
            const left = renderBounds.getX() + this.location.x * scaleX;
            const top = renderBounds.getY() + this.location.y * scaleY;
            const right = left + scaleX;
            const bottom = top + scaleY;
            const outline = 1;

            context.save();
            context.globalAlpha = this.alpha;

            context.fillStyle = "rgba(0,0,0,0.95)";
            context.fillRect(left - outline * 2, top - outline * 2,
                right - left + outline * 4, outline);
            context.fillRect(left - outline * 2, bottom + outline,
                right - left + outline * 4, outline);
            context.fillRect(left - outline * 2, top - outline, outline,
                bottom - top + outline * 2);
            context.fillRect(right + outline, top - outline, outline,
                bottom - top + outline * 2);

            context.fillStyle = "rgba(255,255,255,0.9)";
            context.fillRect(left - outline, top - outline,
                right - left + outline * 2, outline);
            context.fillRect(left - outline, bottom,
                right - left + outline * 2, outline);
            context.fillRect(left - outline, top, outline, bottom - top);
            context.fillRect(right, top, outline, bottom - top);

            context.fillStyle = "rgba(0,0,0,0.95)";
            context.fillRect(left, top, right - left, outline);
            context.fillRect(left, bottom - outline, right - left, outline);
            context.fillRect(left, top + outline, outline, Math.max(0, bottom - top - outline * 2));
            context.fillRect(right - outline, top + outline, outline,
                Math.max(0, bottom - top - outline * 2));
            context.restore();
            return;
        }

        const traceGeometry = () => {
            context.beginPath();
            if (this.shape === "square") {
                context.rect(centerX - width / 2, centerY - height / 2, width, height);
            } else {
                context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
            }
        };

        context.save();
        context.globalAlpha = this.alpha;
        // Paint.NET's brush handle uses a contrasting geometry outline so it
        // remains visible over both light and dark pixels.
        traceGeometry();
        context.lineWidth = 3;
        context.strokeStyle = "rgba(255,255,255,0.9)";
        context.stroke();
        traceGeometry();
        context.lineWidth = 1;
        context.strokeStyle = "rgba(0,0,0,0.95)";
        context.stroke();
        context.restore();
    }
}
