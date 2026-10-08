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

class LayerPropertiesHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace, layerIndex) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.layerIndex = layerIndex;
        this.properties = documentWorkspace.getDocument().getLayers()
            .getAt(layerIndex).properties.clone();
    }

    onUndo() {
        const redo = new LayerPropertiesHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.layerIndex
        );
        const layer = this.documentWorkspace.getDocument().getLayers().getAt(this.layerIndex);
        layer.properties = this.properties.clone();
        layer.invalidate();
        this.documentWorkspace.getApp().fire("document:layer_properties_changed", layer);
        return redo;
    }
}
