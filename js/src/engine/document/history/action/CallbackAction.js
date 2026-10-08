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

class CallbackAction extends Action {

    constructor(actionId, callback, displayName, executable = null, shortcutKeyCombo = null) {
        super(actionId, null, null, shortcutKeyCombo);
        this.callback = callback;
        this.displayName = displayName;
        this.executable = executable;
    }

    runPerformAction() {
        if (this.runIsActionExecutable()) {
            this.callback();
        }
    }

    runIsActionExecutable() {
        return this.executable === null || this.executable();
    }

    getDisplayName() {
        return typeof this.displayName === "function"
            ? this.displayName()
            : (this.displayName || this.actionId);
    }
}
