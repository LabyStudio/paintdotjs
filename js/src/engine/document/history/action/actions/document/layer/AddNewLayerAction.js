class AddNewLayerAction extends LayerAction {

    constructor() {
        super(
            "add.new.layer",
            "addNewLayer",
            "addNewLayerButton",
            "Ctrl+Shift+N"
        );
    }

    performAction(documentWorkspace) {
        documentWorkspace.executeFunction(new AddNewBlankLayerFunction());
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return true;
    }
}