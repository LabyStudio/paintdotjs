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

class SubmenuDropEntry extends DropEntry {

    constructor(id, entries) {
        super(id, () => this.open());
        this.entries = entries;
        this.submenuElement = null;
        this.submenuPopup = null;
    }

    initialize(parent) {
        super.initialize(parent);
        for (const entry of this.entries) {
            entry.initialize(this);
        }
        this.getElement().addEventListener("mouseenter", () => this.open());
        this.getElement().setAttribute("aria-haspopup", "menu");
        this.getElement().setAttribute("aria-expanded", "false");
    }

    buildElement() {
        const element = super.buildElement();
        element.classList.add("submenu-entry");
        const arrow = document.createElement("span");
        arrow.className = "submenu-arrow";
        arrow.setAttribute("aria-hidden", "true");
        element.appendChild(arrow);
        return element;
    }

    isImplemented() {
        return true;
    }

    setEnabledFromActionExecutable() {
        for (const entry of this.entries) {
            entry.setEnabledFromActionExecutable();
        }
        const enabled = this.entries.some(entry => entry.isEnabled());
        this.setEnabled(enabled);
        if (!enabled) {
            this.close();
        }
    }

    onPress(event) {
        if (!this.isEnabled()) {
            return;
        }
        event.stopPropagation();
        this.open();
    }

    open() {
        if (this.submenuElement !== null || !this.isEnabled()) {
            return;
        }
        if (this.parent !== null) {
            for (const sibling of this.parent.entries) {
                if (sibling !== this && sibling instanceof SubmenuDropEntry) {
                    sibling.close();
                }
            }
        }

        this.setEnabledFromActionExecutable();
        if (!this.isEnabled()) {
            return;
        }

        this.submenuPopup = new DropMenuPopup(this.id, {
            className: "effect-submenu",
            exclusive: false
        });
        const submenu = this.submenuPopup.open(this.entries, this);
        submenu.setAttribute("role", "menu");

        const bounds = this.getElement().getBoundingClientRect();
        const opensLeft = bounds.right + submenu.offsetWidth > window.innerWidth;
        const left = opensLeft ? bounds.left - submenu.offsetWidth + 1 : bounds.right - 1;
        const top = Math.min(bounds.top, window.innerHeight - submenu.offsetHeight - 2);
        this.submenuPopup.positionAt(left, Math.max(0, top));
        submenu.classList.toggle("submenu-opens-left", opensLeft);
        this.submenuElement = submenu;
        this.addClassName("open");
        this.getElement().setAttribute("aria-expanded", "true");
    }

    close() {
        this.submenuPopup?.close();
        this.submenuPopup = null;
        this.submenuElement = null;
        this.removeClass("open");
        if (this.isInitialized()) {
            this.getElement().setAttribute("aria-expanded", "false");
        }
    }
}
