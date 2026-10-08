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

class UIElement {

    constructor(id) {
        this.id = id;
        this.parent = null;
        this.app = app;
    }

    initialize(parent) {
        this.parent = parent;
    }

    appendTo(element, parent) {
        this.initialize(parent);
        element.appendChild(this.getElement());
    }

    getElement() {
        throw new Error("Not implemented for " + this.constructor.name);
    }

    getId() {
        return this.id;
    }

    getAsAction() {
        return ActionRegistry.get(this.id);
    }

}