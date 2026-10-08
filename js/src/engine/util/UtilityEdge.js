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

class UtilityEdge {

    constructor(minY, maxY, x, dxdy) {
        // getScans follows the original Paint.NET field names.
        this.miny = minY;
        this.maxy = maxY;
        this.x = x;
        this.dxdy = dxdy;
    }
}
