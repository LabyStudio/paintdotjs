class LayerPropertiesAction extends LayerAction {

    constructor() {
        super(
            "layer.properties",
            "propertiesLayer",
            "propertiesButton",
            "F4"
        );
    }

    performAction(documentWorkspace) {

    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return true;
    }
}