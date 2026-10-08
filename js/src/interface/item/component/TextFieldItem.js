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

class TextFieldItem extends Item {

    constructor(id) {
        super(id);

        this.changeCallback = null;
        this.submitCallback = null;
        this.text = "";
        this.autoSelect = false;
    }

    buildElement() {
        let element = document.createElement("input");
        element.type = "text";
        element.id = this.id;
        element.value = this.text;
        element.oninput = _ => {
            this.text = element.value

            if (this.changeCallback !== null) {
                this.changeCallback(this.text);
            }
        };

        // Listen on enter
        element.onkeydown = e => {
            if (e.key === "Enter") {
                if (this.submitCallback !== null) {
                    this.submitCallback(this.text);
                }
            }
        };

        // Auto select text
        if (this.autoSelect) {
            setTimeout(_ => {
                element.focus();
                element.select();

                let initial = true;
                element.onclick = e => {
                    // Set cursor at end at the first time clicked
                    if (initial) {
                        initial = false;
                        element.selectionStart = element.selectionEnd = element.value.length;
                    }

                    // Prevent closing drop menu
                    e.stopPropagation();
                };
            });
        }

        return element;
    }

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

    setSubmitCallback(callback) {
        this.submitCallback = callback;
    }

    setText(text) {
        this.text = text;

        if (this.element !== null) {
            this.element.value = text;
        }
    }

    setAutoSelect(autoSelect) {
        this.autoSelect = autoSelect;
    }

    getText() {
        return this.text;
    }

    isClickable() {
        return false;
    }

}