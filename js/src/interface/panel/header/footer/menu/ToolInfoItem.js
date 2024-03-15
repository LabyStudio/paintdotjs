class ToolInfoItem extends LabelMenuItem {

    constructor() {
        super("toolInfoItem");
    }

    getSelectedTool() {
        let selector = PanelRegistry.get("toolMenu").get("toolStripChooser.chooseToolButton");
        return selector.getSelectedEntry();
    }

    getIconPath() {
        return this.getSelectedTool().getIconPath();
    }

    getText() {
        let selectedTool = this.getSelectedTool();
        return i18n(selectedTool.getText()) + ": " + i18n(selectedTool.id + ".helpText");
    }

}