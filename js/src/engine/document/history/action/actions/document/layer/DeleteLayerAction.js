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

class DeleteLayerAction extends LayerAction {

    constructor() {
        super(
            "delete.layer",
            "deleteLayer",
            "deleteLayerButton",
            "Ctrl+Shift+Delete"
        );
    }

    performAction(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();
        documentWorkspace.executeFunction(new DeleteLayerFunction(index));
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return size > 1;
    }
}