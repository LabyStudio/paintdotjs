class EditMenu extends DropMenuItem {
    constructor() {
        super("menu.edit", [
            EditMenu.create("undo"),
            EditMenu.create("redo"),
            new VerticalSeparator(),
            new DropEntry("menu.edit.cut", null),
            EditMenu.create("copy"),
            new DropEntry("menu.edit.copyMerged", null),
            EditMenu.create("paste"),
            new DropEntry("menu.edit.pasteInToNewLayer", null),
            new DropEntry("menu.edit.pasteInToNewImage", null),
            new VerticalSeparator(),
            new DropEntry("menu.edit.copySelection", null),
            new DropEntry("menu.edit.pasteSelection", null)
                .withNoIcon(),
            new VerticalSeparator(),
            EditMenu.create("eraseSelection"),
            EditMenu.create("fillSelection"),
            EditMenu.create("invertSelection"),
            EditMenu.create("selectAll"),
            EditMenu.create("deselect"),
        ]);

        this.updateEntriesOn(
            "document:history_changed",
            "document:selection_changed",
            "app:update_active_document"
        );
    }

    static create(id) {
        return ActionRegistry.get("menu.edit." + id).createDropEntry();
    }
}
