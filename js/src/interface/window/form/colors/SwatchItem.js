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

class SwatchItem extends SelectorMenuItem {

    constructor() {
        super("swatch");
    }

    initialize(parent) {
        super.initialize(parent);
        // Entries are rebuilt every time the menu opens so saved/imported
        // palettes appear immediately, just like Paint.NET's palette service.
        this.setEnabled(true);
    }

    open() {
        this.entries = this.parent.createPaletteMenuEntries();
        super.open();
    }

    buildElement() {
        let element = document.createElement("div");
        element.className = "menu-item selector clickable";
        element.id = this.id;
        element.title = "Manage Palettes";
        element.innerText = "";
        {
            let icon = document.createElement("img");
            icon.className = "icon";
            icon.src = "assets/icons/swatch_icon.png";
            element.appendChild(icon);

            // Separator
            let separator = document.createElement("div");
            separator.className = "separator";
            element.appendChild(separator);

            // Arrow
            let arrow = document.createElement("div");
            arrow.className = this.isDropUp() ? "arrow-up" : "arrow-down";
            element.appendChild(arrow);
        }
        return element;
    }
}
