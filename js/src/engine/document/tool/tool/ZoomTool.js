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

class ZoomTool extends Tool {
    constructor(type) {
        super(type);
        this.tracking = false;
        this.button = null;
        this.startPoint = null;
        this.endPoint = null;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursor("zoom-in");
    }

    onMouseDown(x, y, button) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) {
            return false;
        }
        this.tracking = true;
        this.button = button;
        this.startPoint = new Point(x, y);
        this.endPoint = this.startPoint.clone();
        this.app.setCursor(button === MouseButton.RIGHT ? "zoom-out" : "zoom-in");
        return true;
    }

    onMouseMove(x, y) {
        if (!this.tracking) {
            return false;
        }
        this.endPoint = new Point(x, y);
        return true;
    }

    onMouseUp(x, y, button) {
        if (!this.tracking || button !== this.button) {
            return false;
        }
        this.endPoint = new Point(x, y);
        this.tracking = false;
        const workspace = this.getDocumentWorkspace();
        const current = workspace.getZoom();
        const screenStart = workspace.toScreenPosition(this.startPoint);
        const screenEnd = workspace.toScreenPosition(this.endPoint);
        if (button === MouseButton.LEFT && Utility.distance(screenStart, screenEnd) >= 10) {
            workspace.zoomToRectangle(Utility.pointsToRectangle(this.startPoint, this.endPoint));
        } else {
            const factor = Utility.clamp(button === MouseButton.RIGHT ? current / 2 : current * 2, 0.01, 100);
            workspace.setZoomToWindow(false);
            workspace.setZoom(factor, screenEnd.x, screenEnd.y);
        }
        this.app.setCursor("zoom-in");
        return true;
    }
}
