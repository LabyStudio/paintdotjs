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

class MoveActiveLayerDownAction extends LayerAction {

    constructor() {
        super(
            "move.layer.down",
            "moveLayerDown",
            "moveLayerDownButton",
            null
        );
    }

    performAction(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();

        if (index !== 0) {
            let memento = new SwapLayerHistoryMemento(
                i18n("moveLayerDown.historyMementoName"),
                "assets/icons/menu_layers_move_layer_down_icon.png",
                documentWorkspace,
                index,
                index - 1
            );
            return memento.performUndo();
        }

        return null;
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return index !== 0;
    }
}