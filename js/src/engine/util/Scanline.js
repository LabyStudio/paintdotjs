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

class Scanline {
    constructor(x, y, length) {
        this.x = x;
        this.y = y;
        this.length = length;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    getLength() {
        return this.length;
    }

    equals(other) {
        return other instanceof Scanline &&
            this.x === other.x &&
            this.y === other.y &&
            this.length === other.length;
    }

    toString() {
        return `(${this.x},${this.y}):[${this.length}]`;
    }
}