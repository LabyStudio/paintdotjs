class MoveLayerToTopAction extends LayerAction {

    constructor() {
        super(
            "move.layer.to.top",
            "moveLayerToTop",
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