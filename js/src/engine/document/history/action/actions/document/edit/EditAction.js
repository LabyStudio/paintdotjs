class EditAction extends DocumentWorkspaceAction {

    constructor(
        actionId,
        nameId,
        toolTipId,
        shortcutKeyCombo
    ) {
        super(
            "menu.edit." + actionId,
            "menu.edit." + nameId + ".text",
            toolTipId,
            shortcutKeyCombo
        );
    }

}