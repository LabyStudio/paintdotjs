class SelectAllFunction extends HistoryFunction {

    constructor() {
        super();
    }

    onExecute(documentWorkspace) {
        let selection = documentWorkspace.getSelection();

        let memento = new SelectionHistoryMemento(
            i18n("selectAllAction.name"),
            "assets/icons/menu_edit_select_all_icon.png",
            documentWorkspace
        );

        selection.push();
        selection.reset();
        selection.setContinuation(documentWorkspace.getDocument().getBounds(), CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();

        return memento;
    }

}