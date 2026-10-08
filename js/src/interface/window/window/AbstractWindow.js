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

class AbstractWindow {

    constructor() {
        this.open = false;

        this.app = app;
    }

    create() {
        this.open = true;
        this.app.fire("app:window_open_state_changed", this, true);
    }

    close() {
        this.open = false;
        this.app.fire("app:window_open_state_changed", this, false);
    }

    isOpen() {
        return this.open;
    }

    setTitle(title) {
        throw new Error("Not implemented");
    }

    setSize(width, height) {
        throw new Error("Not implemented");
    }

    setPosition(x, y) {
        throw new Error("Not implemented");
    }

    getWidth() {
        throw new Error("Not implemented");
    }

    getHeight() {
        throw new Error("Not implemented");
    }

}