class MoveActiveLayerDownAction extends DocumentWorkspaceAction {

    performAction(documentWorkspace) {
        let index = documentWorkspace.getActiveLayerIndex();

        if (index !== 0) {
            let memento = new SwapLayerHistoryMemento(
                i18n("moveLayerDown.historyMementoName"),
                "assets/icons/menu_layers_move_layer_down_icon.png",
                documentWorkspace,
                index,
                index - 1
            );
            return memento.performUndo();
        }

        return null;
    }

}