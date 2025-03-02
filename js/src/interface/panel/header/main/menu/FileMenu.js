class FileMenu extends DropMenuItem {
    constructor() {
        super("menu.file", [
            FileMenu.create("new"),
            new DropEntry("menu.file.open", null),
            new DropEntry("menu.file.openRecent", null)
                .withNoIcon(),
            new DropEntry("menu.file.acquire", null)
                .withNoIcon(),
            new VerticalSeparator(),
            new DropEntry("menu.file.save", null),
            new DropEntry("menu.file.saveAs", null),
            new DropEntry("menu.file.saveAll", null),
            new VerticalSeparator(),
            new DropEntry("menu.file.print", null),
            new VerticalSeparator(),
            new DropEntry("menu.file.close", null),
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