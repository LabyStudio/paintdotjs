class AppWorkspaceAction extends Action {

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
        if (this.isActionExecutable(app)) {
            this.performAction(app);
        }
    }

    runIsActionExecutable() {
        return this.isActionExecutable(window.app);
    }

    performAction(app) {
        throw new Error("No action implementation provided for " + this.getActionId());
    }

    isActionExecutable(app) {
        return true;
    }

}