class HistoryStack {

    constructor(app, documentWorkspace) {
        this.app = app;
        this.documentWorkspace = documentWorkspace;

        this.undoStack = [];
        this.redoStack = [];
    }

    pushNewMemento(memento) {
        this.clearRedoStack();
        this.undoStack.push(memento);

        this.app.fire("document:history_changed", this.documentWorkspace);
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
            let undoMemento = redoMemento.performUndo();

            // Remove first from redo stack
            this.redoStack.splice(0, 1);

            // Insert at end of undo stack
            this.undoStack.push(undoMemento);

            this.app.fire("document:history_changed", this.documentWorkspace);
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
            let redoMemento = undoMemento.performUndo();

            // Remove last from undo stack
            this.undoStack.splice(this.undoStack.length - 1, 1);

            // Insert at beginning of redo stack
            this.redoStack.splice(0, 0, redoMemento);

            this.app.fire("document:history_changed", this.documentWorkspace);
        }
    }

    stepTo(memento) {
        let undoIndex = this.undoStack.indexOf(memento);
        if (undoIndex !== -1) {
            if (undoIndex === this.undoStack.length - 1) {
                if (this.undoStack.length > 1) {
                    this.stepBackward();
                }
            } else {
                while (this.undoStack[this.undoStack.length - 1].getId() !== memento.getId()) {
                    this.stepBackward();
                }
            }
        } else {
            let redoIndex = this.redoStack.indexOf(memento);
            if (redoIndex !== -1) {
                while (this.undoStack[this.undoStack.length - 1].getId() !== memento.getId()) {
                    this.stepForward();
                }
            }
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

        this.app.fire("document:history_changed", this.documentWorkspace);
    }

    getUndoStack() {
        return this.undoStack;
    }

    getRedoStack() {
        return this.redoStack;
    }
}