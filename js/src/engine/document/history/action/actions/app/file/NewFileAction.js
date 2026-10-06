class NewFileAction extends FileAction {

    constructor() {
        super(
            "new",
            "new",
            null,
            "Ctrl+N"
        );
    }

    performAction(appWorkspace) {
        DocumentIO.createNewDocument();
    }

}
