class DeleteLayerAction extends LayerAction {

    constructor() {
        super(
            "delete.layer",
            "deleteLayer",
            "deleteLayerButton",
            "Ctrl+Shift+Delete"
        );
    }

    performAction(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();
        documentWorkspace.executeFunction(new DeleteLayerFunction(index));
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return size > 1;
    }
}