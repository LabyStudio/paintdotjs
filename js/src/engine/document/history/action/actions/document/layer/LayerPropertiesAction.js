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

class LayerPropertiesAction extends LayerAction {

    constructor() {
        super(
            "layer.properties",
            "layerProperties",
            "propertiesButton",
            "F4"
        );
    }

    async performAction(documentWorkspace) {
        const layerIndex = documentWorkspace.getActiveLayerIndex();
        const layer = documentWorkspace.getActiveLayer();
        const originalProperties = layer.properties.clone();
        const memento = new LayerPropertiesHistoryMemento(
            i18n("menu.layers.layerProperties.text").replace(/\.\.\.$/, ""),
            "assets/icons/menu_layers_layer_properties_icon.png",
            documentWorkspace,
            layerIndex
        );

        // Paint.NET previews layer properties on the document while its modal
        // dialog is open. The history entry is still a single transaction.
        const applyProperties = properties => {
            layer.properties = properties.clone();
            layer.invalidate();
            documentWorkspace.getApp().fire("document:layer_properties_changed", layer);
        };
        const properties = await LayerPropertiesDialog.open(originalProperties.clone(), applyProperties);
        if (properties === null) {
            applyProperties(originalProperties);
            return null;
        }

        applyProperties(properties);
        if (LayerProperties.areEqual(originalProperties, properties)) return null;
        return memento;
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return true;
    }
}
