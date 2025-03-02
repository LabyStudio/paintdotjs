class FileAction extends AppWorkspaceAction {

    constructor(
        actionId,
        nameId,
        toolTipId,
        shortcutKeyCombo
    ) {
        super(
            "menu.file." + actionId,
            "menu.file." + nameId + ".text",
            toolTipId,
            shortcutKeyCombo
        );
    }

    performAction(app) {

    }

}