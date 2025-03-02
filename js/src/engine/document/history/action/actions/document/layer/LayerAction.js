class LayerAction extends DocumentWorkspaceAction {

    constructor(
        commandId,
        nameId,
        toolTipId,
        shortcutKeyCombo
    ) {
        super(
            "menu.layers." + commandId,
            "menu.layers." + nameId + ".text",
            "layerForm." + toolTipId + ".toolTipText",
            shortcutKeyCombo
        );
    }

    isActionExecutable(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();
        let size = documentWorkspace.getDocument().getLayers().size();
        return this.isLayerActionExecutable(documentWorkspace, index, size);
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        throw new Error("No isLayerActionExecutable implementation provided for " + this.getActionId());
    }

}