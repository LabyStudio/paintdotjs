class HistoryUndoAction extends DocumentWorkspaceAction {

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

}