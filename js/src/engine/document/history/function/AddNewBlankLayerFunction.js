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

class AddNewBlankLayerFunction extends HistoryFunction {

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let layers = document.getLayers();
        let name = i18n("addNewBlankLayer.layerName.format", layers.size() + 1);
        let newLayer = Layer.createLayer(documentWorkspace, document.width, document.height, name);

        let newLayerIndex = documentWorkspace.getActiveLayerIndex() + 1;

        let memento = new NewLayerHistoryMemento(
            i18n("addNewBlankLayer.historyMementoName"),
            "assets/icons/menu_layers_add_new_layer_icon.png",
            documentWorkspace,
            newLayerIndex
        )

        layers.insertLayerAt(newLayerIndex, newLayer);

        return memento;
    }

}