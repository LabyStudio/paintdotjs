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
 * The interface design and behavior target Paint.NET 5.2+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class PaintBucketCommitHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, state, bitmapMemento, name, image, restore) {
        super(documentWorkspace, name, image);
        this.state = state;
        this.bitmapMemento = bitmapMemento;
        this.restore = restore;
    }

    onToolUndo() {
        const tool = this.app.getActiveTool();
        if (!(tool instanceof PaintBucketTool)) {
            throw new Error("Current tool is not a PaintBucketTool");
        }

        if (this.restore) {
            const redoBitmapMemento = this.bitmapMemento.performUndo();
            tool.restorePendingState(this.state);
            return new PaintBucketCommitHistoryMemento(
                this.documentWorkspace, this.state, redoBitmapMemento,
                this.name, this.image, false
            );
        }

        tool.cancelPending();
        const undoBitmapMemento = this.bitmapMemento.performUndo();
        return new PaintBucketCommitHistoryMemento(
            this.documentWorkspace, this.state, undoBitmapMemento,
            this.name, this.image, true
        );
    }
}
