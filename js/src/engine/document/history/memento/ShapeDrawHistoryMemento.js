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

class ShapeDrawHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, name, image, state = null, restore = false) {
        super(documentWorkspace, name, image);
        this.state = state;
        this.restore = restore;
    }

    onToolUndo() {
        const tool = this.app.getActiveTool();
        if (!(tool instanceof PreviewShapeTool)) {
            throw new Error("Current tool is not a PreviewShapeTool");
        }

        if (this.restore) {
            tool.restorePendingState(this.state);
            return new ShapeDrawHistoryMemento(
                this.documentWorkspace, this.name, this.image, null, false
            );
        }

        const state = tool.capturePendingState();
        tool.cancelPending();
        return new ShapeDrawHistoryMemento(
            this.documentWorkspace, this.name, this.image, state, true
        );
    }
}
