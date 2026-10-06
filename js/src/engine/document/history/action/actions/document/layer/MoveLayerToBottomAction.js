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
        const index = documentWorkspace.getActiveLayerIndex();
        if (index === 0) return null;

        const memento = new SwapLayerHistoryMemento(
            i18n("moveLayerToBottom.historyMementoName"),
            "assets/icons/menu_layers_move_layer_to_bottom_icon.png",
            documentWorkspace,
            index,
            0
        );
        return memento.performUndo();
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return index > 0;
    }
}
