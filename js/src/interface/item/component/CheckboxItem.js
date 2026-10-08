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

class CheckboxItem extends Item {

    constructor(id = null) {
        super(id);

        this.changeCallback = null;
        this.checked = false;
    }

    buildElement() {
        let element = document.createElement("input");
        if (this.id !== null) {
            element.id = this.id;
        }
        element.type = "checkbox";
        element.checked = this.checked;
        element.addEventListener("mousedown", event => {
            event.stopPropagation();
            event.preventDefault();
        });
        element.oninput = event => {
            this.checked = element.checked;

            if (this.changeCallback !== null) {
                this.changeCallback(this.checked);
            }

            event.stopPropagation();
        };
        return element;
    }

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

    isChecked() {
        return this.checked;
    }

    isClickable() {
        return false;
    }

}