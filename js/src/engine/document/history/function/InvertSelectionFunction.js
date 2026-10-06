class InvertSelectionFunction extends HistoryFunction {

    static NAME = i18n("menu.edit.invertSelection.text");
    static IMAGE = "assets/icons/menu_edit_invert_selection_icon.png";

    onExecute(documentWorkspace) {
        const selection = documentWorkspace.getSelection();
        if (selection.isEmpty()) return null;

        const memento = new SelectionHistoryMemento(
            InvertSelectionFunction.NAME,
            InvertSelectionFunction.IMAGE,
            documentWorkspace
        );
        const currentPath = selection.createPath();
        const documentPath = new GraphicsPath();
        documentPath.addRectangle(documentWorkspace.getDocument().getBounds());
        const inversePath = GraphicsPath.combine(
            documentPath,
            CombineMode.EXCLUDE,
            currentPath
        );
        currentPath.dispose();
        documentPath.dispose();

        selection.push();
        selection.reset();
        selection.setContinuationPath(inversePath, CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();
        return memento;
    }
}
