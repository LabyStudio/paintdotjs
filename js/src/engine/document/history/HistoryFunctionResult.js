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

class HistoryFunctionResult {
    static SUCCESS = 0;
    static SUCCESS_NO_OP = 1;
    static CANCELLED = 2;
    static OUT_OF_MEMORY = 3;
    static NON_FATAL_ERROR = 4;
}