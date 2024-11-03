class MoveActiveLayerUpAction extends DocumentWorkspaceAction {

    performAction(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let index = documentWorkspace.getActiveLayerIndex();

        if (index !== document.getLayers().size() - 1) {
            let swapLayerFunction = new SwapLayerFunction(index, index + 1);
            let memento = swapLayerFunction.execute(documentWorkspace);

            let compoundMemento = new CompoundHistoryMemento(
                i18n("moveLayerUp.historyMementoName"),
                "assets/icons/menu_layers_move_layer_up_icon.png",
                [
                    memento
                ]
            );

            documentWorkspace.setActiveLayer(document.getLayers().getAt(index + 1));

            return compoundMemento;
        }

        return null;
    }

}