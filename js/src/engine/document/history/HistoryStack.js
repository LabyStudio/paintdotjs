class HistoryStack {

    constructor(documentWorkspace) {
        this.documentWorkspace = documentWorkspace;

        this.undoStack = [];
        this.redoStack = [];
    }

    pushNewMemento(memento) {
        this.clearRedoStack();
        this.undoStack.push(memento);
    }

    stepForward() {
        let topMemento = this.redoStack[0];
        let app = this.documentWorkspace.getApp();

        if (topMemento instanceof ToolHistoryMemento && app.getActiveTool().getId() !== topMemento.getToolId()) {
            // Change tool and step forward again
            app.setActiveToolFromId(topMemento.getToolId());
            this.stepForward();
        } else {
            let redoMemento = this.redoStack[0];

            // Perform redo
            let undoMemento = redoMemento.PerformUndo();

            // Remove first from redo stack
            this.redoStack.splice(0, 1);

            // Insert at end of undo stack
            this.undoStack.push(undoMemento);
        }
    }

    stepBackward() {
        let topMemento = this.undoStack[this.undoStack.length - 1];
        let app = this.documentWorkspace.getApp();

        if (topMemento instanceof ToolHistoryMemento && app.getActiveTool().getId() !== topMemento.getToolId()) {
            // Change tool and step backward again
            app.setActiveToolFromId(topMemento.getToolId());
            this.stepBackward();
        } else {
            let undoMemento = this.undoStack[this.undoStack.length - 1];

            // Perform undo
            let redoMemento = undoMemento.PerformUndo();

            // Remove last from undo stack
            this.undoStack.splice(this.undoStack.length - 1, 1);

            // Insert at beginning of redo stack
            this.redoStack.splice(0, 0, redoMemento);
        }
    }

    clearRedoStack() {
        this.redoStack = [];
    }

    clearUndoStack() {
        this.undoStack = [];
    }

    clearAll() {
        this.clearRedoStack();
        this.clearUndoStack();
    }
}