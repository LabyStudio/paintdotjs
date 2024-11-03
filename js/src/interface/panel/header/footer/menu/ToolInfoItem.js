class ToolInfoItem extends LabelMenuItem {

    constructor() {
        super("toolInfoItem");

        this.app.on("app:active_tool_updated", tool => {
            this.reinitialize();
        });
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
        let helpText = i18n(selectedTool.id + ".helpText");
        if (typeof helpText !== "string") {
            helpText = i18n(selectedTool.id + ".helpText.text");
        }
        return i18n(selectedTool.getText()) + ": " + helpText;
    }

}