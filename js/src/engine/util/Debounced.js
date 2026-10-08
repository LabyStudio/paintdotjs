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

class Debounced {

    constructor() {
        this.lastAnimationFrames = new Map();
        this.lastTimeouts = new Map();
    }

    debounce(id, callback) {
        if (this.lastAnimationFrames.has(id)) {
            cancelAnimationFrame(this.lastAnimationFrames.get(id));
        }
        this.lastAnimationFrames.set(id, requestAnimationFrame(() => {
            this.lastAnimationFrames.delete(id);
            callback();
        }));
    }

    debounceTimeout(id, delay, callback) {
        if (this.lastTimeouts.has(id)) {
            clearTimeout(this.lastTimeouts.get(id));
        }
        this.lastTimeouts.set(id, setTimeout(() => {
            this.lastTimeouts.delete(id);
            callback();
        }, delay));
    }

}
