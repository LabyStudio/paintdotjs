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
            this.performAction(documentWorkspace);
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