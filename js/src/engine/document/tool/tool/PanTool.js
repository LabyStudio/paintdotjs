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

class PanTool extends Tool {

    constructor(type) {
        super(type);

        this.tracking = false;
        this.mouseClickX = 0;
        this.mouseClickY = 0;
    }

    onMouseDown(mouseX, mouseY, button) {
        this.app.setCursorImg("hand_closed_cursor");

        // Use last mouse position from app because it uses the screen position
        let screenMousePosX = this.app.getLastMouseX();
        let screenMousePosY = this.app.getLastMouseY();

        this.tracking = true;

        let viewElement = this.app.getViewElement();
        this.mouseClickX = viewElement.scrollLeft + screenMousePosX;
        this.mouseClickY = viewElement.scrollTop + screenMousePosY;

        return true;
    }

    onMouseMove(mouseX, mouseY) {
        if (!this.tracking) {
            return false;
        }

        // Use last mouse position from app because it uses the screen position
        let screenMousePosX = this.app.getLastMouseX();
        let screenMousePosY = this.app.getLastMouseY();

        let viewElement = this.app.getViewElement();
        viewElement.scrollLeft = this.mouseClickX - screenMousePosX;
        viewElement.scrollTop = this.mouseClickY - screenMousePosY;

        return true;
    }

    onMouseUp(mouseX, mouseY, button) {
        if (this.tracking) {
            this.app.setCursorImg("hand_open_cursor");
            this.tracking = false;
            return true;
        }

        return false;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("hand_open_cursor");
    }

    isTracking() {
        return this.tracking;
    }

}
