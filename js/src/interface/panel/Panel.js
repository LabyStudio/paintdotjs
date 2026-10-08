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

class Panel extends UIElement {

    constructor(elementId) {
        super(elementId);

        this.element = document.getElementById(elementId);
        if (this.element == null) {
            this.element = document.createElement("div");
            this.element.id = elementId;
        }
    }

    appendTo(element, parent) {
        this.initialize(parent);
        element.appendChild(this.element);
    }

    getElement() {
        return this.element;
    }

}