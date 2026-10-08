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

class StripPanel extends Panel {

    constructor(elementId, configuration) {
        super(elementId);

        this.itemsList = [];
        this.itemMap = {};
        for (let item of configuration.items || []) {
            if (typeof item === "undefined") {
                throw new Error("Undefined item in StripPanel configuration");
            }
            this.itemMap[item.id] = item;
            this.itemsList.push(item);
        }
    }

    initialize(parent) {
        super.initialize(parent);

        // Clear
        this.element.innerHTML = "";

        for (let item of this.itemsList) {
            item.appendTo(this.element, this);
        }
    }

    add(item) {
        this.itemMap[item.id] = item;
        this.itemsList.push(item);

        item.initialize(this);
        this.element.appendChild(item.getElement());
    }

    remove(id) {
        let item = this.itemMap[id];
        delete this.itemMap[id];
        this.itemsList.splice(this.itemsList.indexOf(item), 1);
        this.element.removeChild(item.getElement());
    }

    updateItemsEnabledState() {
        for (let item of this.itemsList) {
            if (typeof item.setEnabledFromActionExecutable === "function") {
                item.setEnabledFromActionExecutable();
            }
        }
    }

    get(id) {
        return this.itemMap[id];
    }

    getItemList() {
        return this.itemsList;
    }
}
