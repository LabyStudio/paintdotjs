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

class Form extends Debounced {

    constructor(id) {
        super();
        this.id = id;
        this.window = null;
        this.app = app;
    }

    initializeDefault(window) {

    }

    initialize(window) {
        this.window = window;

        window.setTitle(this.getTitle());

        this.window.setContent(this.buildContent());
    }

    postInitialize() {

    }

    reinitialize() {
        this.debounce("reinitialize", () => {
            this.initialize(this.window);
            this.postInitialize();
        });
    }

    getTitle() {
        return i18n(this.id + ".text");
    }

    buildContent() {
        return document.createElement("div");
    }

    getWindow() {
        return this.window;
    }
}