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

class MoveLayerToBottomAction extends LayerAction {

    constructor() {
        super(
            "move.layer.to.bottom",
            "moveLayerToBottom",
            null,
            null
        );
    }

    performAction(documentWorkspace) {
        const index = documentWorkspace.getActiveLayerIndex();
        if (index === 0) return null;

        const memento = new SwapLayerHistoryMemento(
            i18n("moveLayerToBottom.historyMementoName"),
            "assets/icons/menu_layers_move_layer_to_bottom_icon.png",
            documentWorkspace,
            index,
            0
        );
        return memento.performUndo();
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return index > 0;
    }
}
