class DeselectAction extends EditAction {

    constructor() {
        super("deselect", "deselect", null, "Ctrl+D");
    }

    performAction(documentWorkspace) {
        documentWorkspace.executeFunction(new DeselectFunction());
    }

    isActionExecutable(documentWorkspace) {
        return !documentWorkspace.getSelection().isEmpty();
    }
}
