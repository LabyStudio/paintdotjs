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

class MoveToolBaseEdge {
    static TOP_LEFT = 0;
    static TOP = 1;
    static TOP_RIGHT = 2;
    static RIGHT = 3;
    static BOTTOM_RIGHT = 4;
    static BOTTOM = 5;
    static BOTTOM_LEFT = 6;
    static LEFT = 7;
    static NONE = 99;
}
