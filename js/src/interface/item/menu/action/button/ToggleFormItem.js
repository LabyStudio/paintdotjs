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

class ToggleFormItem extends IconItem {

    constructor(id, formId) {
        super(id, () => {
            this.toggle();
        });

        this.formId = formId;
        this.active = false;
        this.setEnabled(false);

        this.app.on("app:window_open_state_changed", (window, isOpen) => {
            let form = FormRegistry.get(this.formId);
            if (form !== null && window === form.getWindow()) {
                this.active = isOpen;
                this.setEnabled(true);
                this.reinitialize();
            }
        });
    }

    buildElement() {
        let element = super.buildElement();
        if (this.active) {
            element.setAttribute("active", true);
        } else {
            element.removeAttribute("active");
        }
        return element;
    }

    toggle() {
        let form = FormRegistry.get(this.formId);
        if (form === null) {
            return;
        }

        let window = form.getWindow();
        if (window.isOpen()) {
            window.close();
        } else {
            window.create();
        }
    }
}