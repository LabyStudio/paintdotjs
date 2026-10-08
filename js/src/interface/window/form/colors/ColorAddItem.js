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

class ColorAddItem extends IconItem {

    constructor() {
        super("colorAdd", _ => {
            this.parent.toggleColorAddMode();
        });

        this.colorElement = null;

        this.withIconPathKey("color_add_overlay", true);
    }

    buildElement() {
        let element = super.buildElement();
        element.title = "Add Color to Palette";
        {
            this.colorElement = document.createElement("div");
            this.colorElement.classList.add("color");
            element.appendChild(this.colorElement);
        }
        return element;
    }

    setColor(color) {
        this.colorElement.style.backgroundColor = color.toHex();
    }

    setChecked(checked) {
        this.setActive(checked);
        if (this.element !== null) this.element.setAttribute("aria-pressed", checked ? "true" : "false");
    }
}
