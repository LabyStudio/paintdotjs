/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

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
