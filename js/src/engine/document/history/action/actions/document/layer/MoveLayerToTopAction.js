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
        const index = documentWorkspace.getActiveLayerIndex();
        const topIndex = documentWorkspace.getDocument().getLayers().size() - 1;
        if (index === topIndex) return null;

        const memento = new SwapLayerHistoryMemento(
            i18n("moveLayerToTop.historyMementoName"),
            "assets/icons/menu_layers_move_layer_to_top_icon.png",
            documentWorkspace,
            index,
            topIndex
        );
        return memento.performUndo();
    }

    isLayerActionExecutable(documentWorkspace, index, size) {
        return index < size - 1;
    }
}
