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

class SelectionHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.savedSelectionData = documentWorkspace.getSelection().save();
    }

    onUndo() {
        let memento = new SelectionHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace
        );
        this.documentWorkspace.getSelection().restore(this.savedSelectionData);

        return memento;
    }
}