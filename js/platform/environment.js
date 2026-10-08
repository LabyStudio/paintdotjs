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

const isApp = typeof require !== 'undefined';
const windowTop = () => document.getElementsByTagName("header")[0].getClientRects()[0].y;

const setTitle = (string) => {
    document.title = string;
    window.updatePlatformTitle?.(string);
}

const loadScript = (path) => {
    document.write('<script src="' + path + '"></script>');
}

loadScript(isApp ? './js/platform/desktop/desktop.js' : './js/platform/web/web.js');
