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

class LayerAction extends DocumentWorkspaceAction {

    constructor(
        commandId,
        nameId,
        toolTipId,
        shortcutKeyCombo
    ) {
        super(
            "menu.layers." + commandId,
            "menu.layers." + nameId + ".text",
            "layerForm." + toolTipId + ".toolTipText",
            shortcutKeyCombo
        );
    }

    isActionExecutable(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();
        let size = documentWorkspace.getDocument().getLayers().size();
        return this.isLayerActionExecutable(documentWorkspace, index, size);
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        throw new Error("No isLayerActionExecutable implementation provided for " + this.getActionId());
    }

}