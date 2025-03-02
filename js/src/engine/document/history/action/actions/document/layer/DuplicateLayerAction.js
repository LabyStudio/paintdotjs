class DuplicateLayerAction extends LayerAction {

    constructor() {
        super(
            "duplicate.layer",
            "duplicateLayer",
            "duplicateLayerButton",
            "Ctrl+Shift+D"
        );
    }

    performAction(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();
        documentWorkspace.executeFunction(new DuplicateLayerFunction(index));
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return true;
    }
}