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

class SettingsEntry {

    constructor(dialog, definition) {
        this.settingsDialog = dialog;
        this.definition = definition;

        // Entry implementations use the same concise `this.page` and helper
        // style as the dialog shell. Unknown properties transparently belong
        // to the shared dialog, while entry methods remain on the subclass.
        return new Proxy(this, {
            get: (target, property, receiver) => {
                if (Reflect.has(target, property)) {
                    const value = Reflect.get(target, property, receiver);
                    return typeof value === "function" ? value.bind(receiver) : value;
                }
                const value = dialog[property];
                return typeof value === "function" ? value.bind(receiver) : value;
            },
            set: (target, property, value, receiver) => {
                if (Reflect.has(target, property)) {
                    return Reflect.set(target, property, value, receiver);
                }
                dialog[property] = value;
                return true;
            }
        });
    }

    render() {
        throw new Error(`Settings entry ${this.definition.id} does not implement render().`);
    }

    scrollToAddedRow(row) {
        if (row === null) {
            return;
        }
        requestAnimationFrame(() => {
            if (row.isConnected) {
                row.scrollIntoView({block: "nearest", inline: "nearest"});
            }
        });
    }

    deactivate() {
        // Most entries do not own temporary resources.
    }
}
