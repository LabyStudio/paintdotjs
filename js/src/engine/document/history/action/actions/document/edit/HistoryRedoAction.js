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

class HistoryRedoAction extends EditAction {

    constructor() {
        super(
            "redo",
            "redo",
            null,
            "Ctrl+Y"
        );
    }

    performAction(documentWorkspace) {
        let history = documentWorkspace.getHistory();
        let redoStack = history.getRedoStack();
        if (redoStack.length > 0) {
            let lastMemento = redoStack[redoStack.length - 1];
            if (!(lastMemento instanceof NullHistoryMemento)) {
                history.stepForward();
            }
        }
        return null;
    }

    isActionExecutable(documentWorkspace) {
        let history = documentWorkspace.getHistory();
        let redoStack = history.getRedoStack();
        if (redoStack.length > 0) {
            let lastMemento = redoStack[redoStack.length - 1];
            return !(lastMemento instanceof NullHistoryMemento);
        }
        return false;
    }
}