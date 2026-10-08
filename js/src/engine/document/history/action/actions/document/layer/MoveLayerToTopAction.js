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

class MoveLayerToTopAction extends LayerAction {

    constructor() {
        super(
            "move.layer.to.top",
            "moveLayerToTop",
            null,
            null
        );
    }

    performAction(documentWorkspace) {
        const index = documentWorkspace.getActiveLayerIndex();
        const topIndex = documentWorkspace.getDocument().getLayers().size() - 1;
        if (index === topIndex) return null;

        const memento = new SwapLayerHistoryMemento(
            i18n("moveLayerToTop.historyMementoName"),
            "assets/icons/menu_layers_move_layer_to_top_icon.png",
            documentWorkspace,
            index,
            topIndex
        );
        return memento.performUndo();
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return index < size - 1;
    }
}
