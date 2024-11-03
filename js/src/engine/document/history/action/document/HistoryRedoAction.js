class HistoryRedoAction extends DocumentWorkspaceAction {

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

}