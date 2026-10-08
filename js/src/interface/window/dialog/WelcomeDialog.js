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

class WelcomeDialog extends AboutDialog {

    constructor() {
        super(true);
    }

    static open(force = false) {
        if (isApp || AboutDialog.instance !== null || (!force && this.isDismissed())) {
            return;
        }
        AboutDialog.instance = new WelcomeDialog();
        AboutDialog.instance.show();
    }

    static isDismissed() {
        try {
            return localStorage.getItem(this.storageKey) === "true";
        } catch (_) {
            return false;
        }
    }

    static dismiss() {
        try {
            localStorage.setItem(this.storageKey, "true");
        } catch (_) {
            // Local storage is optional in restricted browser contexts.
        }
    }
}

WelcomeDialog.storageKey = "paintdotjs.welcome.dismissed";
