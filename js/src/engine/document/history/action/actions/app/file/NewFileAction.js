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
        appWorkspace.createBlankDocumentInNewWorkspace(1920, 1017);
    }

}
