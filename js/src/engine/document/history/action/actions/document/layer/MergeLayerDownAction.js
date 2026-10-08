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

class MergeLayerDownAction extends LayerAction {

    constructor() {
        super(
            "merge.layer.down",
            "mergeLayerDown",
            "mergeLayerDownButton",
            "Ctrl+M"
        );
    }

    performAction(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let index = documentWorkspace.getActiveLayerIndex();

        if (index > 0) {
            let layers = document.getLayers();
            let newLayerIndex = Utility.clamp(index - 1, 0, layers.size() - 1);

            documentWorkspace.executeFunction(new MergeLayerDownFunction(index));
            documentWorkspace.setActiveLayerIndex(newLayerIndex);
        }

        return null;
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return index !== 0;
    }

}