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

class MenuItem extends Item {

    constructor(id = null, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let element = document.createElement("div");
        element.className = "menu-item";
        if (this.id !== null) {
            element.id = this.id;
        }
        if (this.isClickable()) {
            element.className += " clickable";
        }
        element.innerHTML = this.getText();
        return element;
    }

    updateText(text = this.getText()) {
        if (this.element === null || text === null) {
            return;
        }
        this.element.innerHTML = text;
    }

    getText() {
        return i18n(this.id + ".text");
    }
}