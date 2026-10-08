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

class DeleteLayerHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace, deleteMe) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.index = documentWorkspace.getDocument().getLayers().indexOf(deleteMe);
        this.data = new DeleteLayerHistoryMementoData(deleteMe);
    }

    onUndo() {
        let memento = new NewLayerHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.index
        );
        memento.setId(this.getId());

        let layers = this.documentWorkspace.getDocument().getLayers();
        layers.insertLayerAt(this.index, this.data.getLayer());
        layers.getAt(this.index).invalidate();

        return memento;
    }


}