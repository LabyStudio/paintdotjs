class FileWindowMenu extends DropMenuItem {
    constructor() {
        super("menu.file", [
            new DropEntry("menu.file.new", null),
            new DropEntry("menu.file.open", null),
            new DropEntry("menu.file.openRecent", null)
                .withNoIcon(),
            new DropEntry("menu.file.acquire", null)
                .withNoIcon(),
            new DropSeparator(),
            new DropEntry("menu.file.save", null),
            new DropEntry("menu.file.saveAs", null),
            new DropEntry("menu.file.saveAll", null),
            new DropSeparator(),
            new DropEntry("menu.file.print", null),
            new DropSeparator(),
            new DropEntry("menu.file.close", null),
            new DropSeparator(),
            new DropEntry("menu.file.exit", () => {
                window.close();
            }),
        ]);
    }
}