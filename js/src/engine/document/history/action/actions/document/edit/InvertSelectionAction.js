class InvertSelectionAction extends EditAction {

    constructor() {
        super("invertSelection", "invertSelection", null, "Ctrl+I");
    }

    performAction(documentWorkspace) {
        documentWorkspace.executeFunction(new InvertSelectionFunction());
    }

    isActionExecutable(documentWorkspace) {
        return !documentWorkspace.getSelection().isEmpty();
    }
}
