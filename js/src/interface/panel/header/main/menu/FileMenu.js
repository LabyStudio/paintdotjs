class FileMenu extends DropMenuItem {
    constructor() {
        super("menu.file", [
            FileMenu.create("new"),
            FileMenu.create("open"),
            new DropEntry("menu.file.openRecent", null)
                .withNoIcon(),
            new DropEntry("menu.file.acquire", null)
                .withNoIcon(),
            new VerticalSeparator(),
            FileMenu.create("save"),
            FileMenu.create("saveAs"),
            FileMenu.create("saveAll"),
            new VerticalSeparator(),
            FileMenu.create("print"),
            new VerticalSeparator(),
            FileMenu.create("close"),
            new VerticalSeparator(),
            new DropEntry("menu.file.exit", () => {
                window.close();
            }),
        ]);

        this.updateEntriesOn("document:dirty_changed", "app:update_active_document");
    }

    static create(id) {
        return ActionRegistry.get("menu.file." + id).createDropEntry();
    }
}
