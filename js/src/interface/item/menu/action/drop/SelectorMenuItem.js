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

class SelectorMenuItem extends DropMenuItem {

    constructor(id, entries = []) {
        super(id, entries);

        this.selected = null;
    }

    buildElement() {
        let selectedEntry = this.getSelectedEntry();

        let element = super.buildElement();
        element.className += " selector";
        {
            // Icon
            if (selectedEntry != null && selectedEntry.hasIcon() && this.showSelectedIcon()) {
                let icon = document.createElement("img");
                icon.className = "icon";
                icon.src = "assets/icons/" + selectedEntry.getIconPath();
                element.appendChild(icon);
            }

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

    getSelectedId() {
        return this.selected;
    }

    getSelectedEntry() {
        for (let entry of this.entries) {
            if (entry.id === this.selected) {
                return entry;
            }
        }
        return this.entries.length === 0 ? null : this.entries[0];
    }

    selectNextEntry() {
        let index = this.entries.indexOf(this.getSelectedEntry());
        let nextIndex = (index + 1) % this.entries.length;
        const nextEntry = this.entries[nextIndex];
        if (nextEntry.pressable !== null) {
            nextEntry.pressable();
        } else {
            this.setSelectedId(nextEntry.id);
        }
    }

    setSelectedId(id) {
        this.selected = id;
        this.reinitialize();
    }

    showSelectedIcon() {
        return true;
    }
}
