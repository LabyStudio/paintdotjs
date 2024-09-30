class MergeLayerDownAction extends DocumentWorkspaceAction {

    performAction(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let index = documentWorkspace.getActiveLayerIndex();

        if (index > 0) {
            let layers = document.getLayers();
            let newLayerIndex = MathHelper.clamp(index - 1, 0, layers.size() - 1);

            let memento = documentWorkspace.executeFunction(new MergeLayerDownFunction(index));

            documentWorkspace.setActiveLayerIndex(newLayerIndex);

            return memento;
        }

        return null;
    }

}