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

class LabelMenuItem extends ActionItem {

    constructor(id) {
        super(id);
    }

    buildElement() {
        let wrapper = document.createElement("div");
        wrapper.className = "label-menu-item";
        {
            // Icon
            if (this.hasIconImage) {
                let icon = document.createElement("img");
                icon.className = "icon";
                icon.src = "assets/icons/" + this.getIconPath();
                icon.onerror = event => {
                    icon.style.opacity = '0';
                }
                wrapper.appendChild(icon);
            }

            // Text
            let element = super.buildElement();
            element.className += " label";
            wrapper.appendChild(element);
        }
        return wrapper;
    }

    updateText(text = this.getText()) {
        if (this.element === null) {
            return;
        }
        this.element.children[1].innerHTML = text;
    }

    isClickable() {
        return false;
    }

}