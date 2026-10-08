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

class ShapeEditHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, state, name, image) {
        super(documentWorkspace, name, image);
        this.state = state;
    }

    onToolUndo() {
        const tool = this.app.getActiveTool();
        if (!(tool instanceof PreviewShapeTool)) {
            throw new Error("Current tool is not a PreviewShapeTool");
        }

        const inverseState = tool.capturePendingState();
        tool.cancelBitmapTransaction();
        tool.restorePendingState(this.state);
        return new ShapeEditHistoryMemento(
            this.documentWorkspace, inverseState, this.name, this.image
        );
    }
}
