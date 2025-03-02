class NewFileAction extends FileAction {

    constructor() {
        super(
            "new",
            "new",
            null,
            null
        );
    }

    performAction(appWorkspace) {
        appWorkspace.createBlankDocumentInNewWorkspace(1920, 1017);
    }

}