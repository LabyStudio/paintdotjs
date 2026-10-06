class EraseSelectionAction extends EditAction {

    constructor() {
        super("eraseSelection", "eraseSelection", null, "Delete");
    }

    performAction(documentWorkspace) {
        documentWorkspace.executeFunction(new EraseSelectionFunction());
    }

    isActionExecutable(documentWorkspace) {
        return !documentWorkspace.getSelection().isEmpty()
            && documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }
}
