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

class ToolHistoryMemento extends HistoryMemento {

    constructor(documentWorkspace, name, image) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.app = documentWorkspace.getApp();
        this.toolType = this.app.getActiveTool().getType();
    }

    getDocumentWorkspace() {
        return this.documentWorkspace;
    }

    getToolType() {
        return this.toolType;
    }

    onToolUndo() {
        throw new Error("Not implemented");
    }

    onUndo() {
        if (this.app.getActiveTool().getType() !== this.toolType) {
            this.app.setActiveToolFromType(this.toolType);
        }

        return this.onToolUndo();
    }
}