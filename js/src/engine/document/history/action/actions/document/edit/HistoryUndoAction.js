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

class HistoryUndoAction extends EditAction {

    constructor() {
        super(
            "undo",
            "undo",
            null,
            "Ctrl+Z"
        );
    }

    performAction(documentWorkspace) {
        let history = documentWorkspace.getHistory();
        let undoStack = history.getUndoStack();
        if (undoStack.length > 0) {
            let lastMemento = undoStack[undoStack.length - 1];
            if (!(lastMemento instanceof NullHistoryMemento)) {
                history.stepBackward();
            }
        }
        return null;
    }

    isActionExecutable(documentWorkspace) {
        let history = documentWorkspace.getHistory();
        let undoStack = history.getUndoStack();
        if (undoStack.length > 0) {
            let lastMemento = undoStack[undoStack.length - 1];
            return !(lastMemento instanceof NullHistoryMemento);
        }
        return false;
    }

}