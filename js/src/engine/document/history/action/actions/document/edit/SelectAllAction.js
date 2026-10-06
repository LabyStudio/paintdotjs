class SelectAllAction extends EditAction {

    constructor() {
        super("selectAll", "selectAll", null, "Ctrl+A");
    }

    performAction(documentWorkspace) {
        documentWorkspace.executeFunction(new SelectAllFunction());
    }
}
