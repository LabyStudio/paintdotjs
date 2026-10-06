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
            new DropEntry("menu.file.saveAll", null),
            new VerticalSeparator(),
            new DropEntry("menu.file.print", null),
            new VerticalSeparator(),
            FileMenu.create("close"),
            new VerticalSeparator(),
            new DropEntry("menu.file.exit", () => {
                window.close();
            }),
        ]);

        // TODO this.updateEntriesOn("");
    }

    static create(id) {
        return ActionRegistry.get("menu.file." + id).createDropEntry();
    }
}
