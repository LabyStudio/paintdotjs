class EditWindowMenu extends DropMenuItem {
    constructor() {
        super("menu.edit", [
            new DropEntry("menu.edit.undo", null),
            new DropEntry("menu.edit.redo", null),
            new DropSeparator(),
            new DropEntry("menu.edit.cut", null),
            new DropEntry("menu.edit.copy", null),
            new DropEntry("menu.edit.copyMerged", null),
            new DropEntry("menu.edit.paste", null),
            new DropEntry("menu.edit.pasteInToNewLayer", null),
            new DropEntry("menu.edit.pasteInToNewImage", null),
            new DropSeparator(),
            new DropEntry("menu.edit.copySelection", null),
            new DropEntry("menu.edit.pasteSelection", null)
                .withNoIcon(),
            new DropSeparator(),
            new DropEntry("menu.edit.eraseSelection", null),
            new DropEntry("menu.edit.fillSelection", null),
            new DropEntry("menu.edit.invertSelection", null),
            new DropEntry("menu.edit.selectAll", null),
            new DropEntry("menu.edit.deselect", null),
        ]);
    }
}