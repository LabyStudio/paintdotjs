class ToggleLayerVisibilityAction extends LayerAction {

    constructor() {
        super(
            "toggle.layer.visibility",
            "toggleLayerVisibility",
            null,
            null
        );
    }

    performAction(documentWorkspace) {
        let layer = documentWorkspace.getActiveLayer();
        layer.setVisible(!layer.isVisible());
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return true;
    }
}