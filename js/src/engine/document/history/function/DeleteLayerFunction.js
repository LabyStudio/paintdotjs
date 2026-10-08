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

class DeleteLayerFunction extends HistoryFunction {

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

        let memento = new DeleteLayerHistoryMemento(
            i18n("deleteLayer.historyMementoName"),
            "assets/icons/menu_layers_delete_layer_icon.png",
            documentWorkspace,
            layers.getAt(this.layerIndex)
        );

        layers.removeLayerAt(this.layerIndex);

        return memento;
    }

}