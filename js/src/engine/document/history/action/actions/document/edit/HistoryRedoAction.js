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