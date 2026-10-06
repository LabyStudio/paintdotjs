class DocumentWorkspaceAction extends Action {

    constructor(
        actionId,
        nameTranslationId,
        descriptionTranslationId,
        shortcutKeyCombo
    ) {
        super(
            actionId,
            nameTranslationId,
            descriptionTranslationId,
            shortcutKeyCombo
        );
    }

    runPerformAction() {
        let app = window.app;
        let documentWorkspace = app.getActiveDocumentWorkspace();
        if (documentWorkspace !== null && this.isActionExecutable(documentWorkspace)) {
            const memento = this.performAction(documentWorkspace);
            if (memento !== null && memento !== undefined && typeof memento.then === "function") {
                memento.then(result => {
                    if (result instanceof HistoryMemento) {
                        documentWorkspace.getHistory().pushNewMemento(result);
                    }
                }).catch(error => app.handleError(error));
                return;
            }
            if (memento instanceof HistoryMemento) {
                documentWorkspace.getHistory().pushNewMemento(memento);
            }
        }
    }

    runIsActionExecutable() {
        let app = window.app;
        let documentWorkspace = app.getActiveDocumentWorkspace();
        return documentWorkspace !== null && this.isActionExecutable(documentWorkspace);
    }

    performAction(documentWorkspace) {
        throw new Error("No action implementation provided for " + this.getActionId());
    }

    isActionExecutable(documentWorkspace) {
        return true;
    }

}
