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

class DeselectAction extends EditAction {

    constructor() {
        super("deselect", "deselect", null, "Ctrl+D");
    }

    performAction(documentWorkspace) {
        documentWorkspace.executeFunction(new DeselectFunction());
    }

    isActionExecutable(documentWorkspace) {
        return !documentWorkspace.getSelection().isEmpty();
    }
}
