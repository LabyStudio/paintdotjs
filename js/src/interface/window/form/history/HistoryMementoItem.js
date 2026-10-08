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

class HistoryMementoItem extends MenuItem {

    constructor(type, memento) {
        super();

        this.type = type;

        this.memento = memento;
        this.enabled = true;
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " history-item " + (this.type === ItemType.UNDO ? "undo" : "redo");
        {
            // Icon
            let icon = document.createElement("img");
            icon.className = "icon";
            icon.src = this.memento.getImage();
            element.appendChild(icon);

            // Name
            let name = document.createElement("span");
            name.innerHTML = this.memento.getName();
            element.appendChild(name);
        }
        return element;
    }

    getText() {
        return null;
    }

    getType() {
        return this.type;
    }

    getMemento() {
        return this.memento;
    }

    getKey() {
        return this.memento;
    }
}