class FillSelectionAction extends EditAction {

    constructor(secondary = false) {
        super(
            secondary ? "fillSelectionSecondary" : "fillSelection",
            secondary ? "fillSelectionSecondary" : "fillSelection",
            null,
            secondary ? "Shift+Backspace" : "Backspace"
        );
        this.secondary = secondary;
    }

    performAction(documentWorkspace) {
        const colors = FormRegistry.get("colorsForm");
        if (colors === null) return;
        const color = this.secondary ? colors.secondaryColor : colors.mainColor;
        documentWorkspace.executeFunction(new FillSelectionFunction(
            color,
            i18n("menu.edit.fillSelection.text"),
            "assets/icons/menu_edit_fill_selection_icon.png"
        ));
    }

    isActionExecutable(documentWorkspace) {
        return !documentWorkspace.getSelection().isEmpty()
            && documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }
}
