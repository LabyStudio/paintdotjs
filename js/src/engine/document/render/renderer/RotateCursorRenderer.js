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

class RotateCursorRenderer extends SurfaceBoxRenderer {

    constructor(surfaceBox) {
        super(surfaceBox);
        this.location = new Point(0, 0);
        this.angle = 0;
        this.setVisible(false);
    }

    setIndicator(location, angle) {
        this.location = location.clone();
        this.angle = angle;
    }

    render(destination, renderBounds) {
        super.render(destination, renderBounds);

        const surface = this.surfaceBox.getSurface();
        if (surface === null || this.location === null) {
            return;
        }

        const scaleX = renderBounds.getWidth() / surface.getWidth();
        const scaleY = renderBounds.getHeight() / surface.getHeight();
        const x = Math.round(renderBounds.getX() + this.location.x * scaleX);
        const y = Math.round(renderBounds.getY() + this.location.y * scaleY);
        const radius = 50;
        const halfArc = 16 * Math.PI / 180;
        const centerX = Math.cos(this.angle) * radius;
        const centerY = Math.sin(this.angle) * radius;
        const middle = this.angle + Math.PI;
        const start = middle - halfArc;
        const end = middle + halfArc;
        const context = destination.getContext();

        const pointOnArc = theta => new Point(
            centerX + Math.cos(theta) * radius,
            centerY + Math.sin(theta) * radius
        );

        const traceIndicator = () => {
            context.beginPath();
            context.arc(centerX, centerY, radius, start, end);

            const traceArrow = (theta, direction) => {
                const tip = pointOnArc(theta);
                const tangentX = direction * -Math.sin(theta);
                const tangentY = direction * Math.cos(theta);
                const normalX = -tangentY;
                const normalY = tangentX;
                const baseX = tip.x - tangentX * 4;
                const baseY = tip.y - tangentY * 4;
                context.moveTo(baseX + normalX * 2.25, baseY + normalY * 2.25);
                context.lineTo(tip.x, tip.y);
                context.lineTo(baseX - normalX * 2.25, baseY - normalY * 2.25);
            };

            traceArrow(start, -1);
            traceArrow(end, 1);
        };

        context.save();
        context.translate(x, y);
        context.lineCap = "round";
        context.lineJoin = "round";
        traceIndicator();
        context.strokeStyle = "white";
        context.lineWidth = 3.5;
        context.stroke();
        traceIndicator();
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.stroke();
        context.restore();
    }
}
