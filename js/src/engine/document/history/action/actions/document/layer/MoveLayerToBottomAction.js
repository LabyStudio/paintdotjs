class MoveLayerToBottomAction extends LayerAction {

    constructor() {
        super(
            "move.layer.to.bottom",
            "moveLayerToBottom",
            null,
            null
        );
    }

    performAction(documentWorkspace) {

    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return true;
    }
}