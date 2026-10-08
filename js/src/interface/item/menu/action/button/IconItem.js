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

class IconItem extends ActionItem {

    constructor(id, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " icon-item";
        element.innerHTML = "";
        {
            let icon = document.createElement("img");
            icon.className = "icon";
            if (this.isImplemented()) {
                const action = this.getAsAction();
                const tooltip = action === null ? null : action.getTooltipText();
                icon.setAttribute("title", tooltip || this.getText());
            }
            if (this.hasIcon()) {
                icon.src = "assets/icons/" + this.getIconPath();
                icon.onerror = event => {
                    icon.style.opacity = '0';
                }
            } else {
                icon.style.opacity = '0';
            }
            element.appendChild(icon);
        }
        return element;
    }

    static fromActionItem(actionItem) {
        let iconItem = new IconItem(actionItem.id, actionItem.pressable);
        iconItem.hasIconImage = actionItem.hasIconImage;
        iconItem.translationKey = actionItem.translationKey;
        iconItem.absoluteTranslationKey = actionItem.absoluteTranslationKey;
        iconItem.iconPathKey = actionItem.iconPathKey;
        iconItem.absoluteIconPathKey = actionItem.absoluteIconPathKey;
        return iconItem;
    }
}
