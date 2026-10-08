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

class ShapeCommitHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, state, bitmapMemento, name, image, restore) {
        super(documentWorkspace, name, image);
        this.state = state;
        this.bitmapMemento = bitmapMemento;
        this.restore = restore;
    }

    onToolUndo() {
        const tool = this.app.getActiveTool();
        if (!(tool instanceof PreviewShapeTool)) {
            throw new Error("Current tool is not a PreviewShapeTool");
        }

        if (this.restore) {
            const redoBitmapMemento = this.bitmapMemento.performUndo();
            tool.restorePendingState(this.state);
            return new ShapeCommitHistoryMemento(
                this.documentWorkspace, this.state, redoBitmapMemento,
                this.name, this.image, false
            );
        }

        tool.cancelPending();
        const undoBitmapMemento = this.bitmapMemento.performUndo();
        return new ShapeCommitHistoryMemento(
            this.documentWorkspace, this.state, undoBitmapMemento,
            this.name, this.image, true
        );
    }
}
