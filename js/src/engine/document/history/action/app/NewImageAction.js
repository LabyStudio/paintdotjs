class NewImageAction extends AppWorkspaceAction {

    performAction(appWorkspace) {
        appWorkspace.createBlankDocumentInNewWorkspace(1920, 1017);
    }

}