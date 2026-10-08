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

class DuplicateLayerFunction extends HistoryFunction {

    constructor(layerIndex) {
        super();
        this.layerIndex = layerIndex;
    }

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let layers = document.getLayers();

        if (this.layerIndex < 0 || this.layerIndex >= layers.size()) {
            throw new Error("layerIndex = " + this.layerIndex + ", expected [0, " + layers.size() + ")");
        }

        // Duplicate the active layer
        let newLayer = documentWorkspace.getActiveLayer().clone();
        newLayer.getProperties().isBackground = false;
        let newLayerIndex = this.layerIndex + 1;

        let memento = new NewLayerHistoryMemento(
            i18n("duplicateLayer.historyMementoName"),
            "assets/icons/menu_layers_duplicate_layer_icon.png",
            documentWorkspace,
            this.layerIndex
        );

        layers.insertLayerAt(newLayerIndex, newLayer);
        newLayer.invalidate();

        return memento;
    }

}