class DeselectFunction extends HistoryFunction {

    static NAME = i18n("deselectAction.name");
    static IMAGE = "assets/icons/menu_edit_deselect_icon.png";

    constructor() {
        super();
    }

    onExecute(documentWorkspace) {
        let selection = documentWorkspace.getSelection();

        let memento = new SelectionHistoryMemento(
            DeselectFunction.NAME,
            DeselectFunction.IMAGE,
            documentWorkspace
        );

        selection.push();
        selection.reset();
        selection.pop();

        return memento;
    }

}