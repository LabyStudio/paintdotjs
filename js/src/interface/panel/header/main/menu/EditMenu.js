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

class EditMenu extends DropMenuItem {
    constructor() {
        super("menu.edit", [
            EditMenu.create("undo"),
            EditMenu.create("redo"),
            new VerticalSeparator(),
            EditMenu.create("cut"),
            EditMenu.create("copy"),
            EditMenu.create("copyMerged"),
            EditMenu.create("paste"),
            EditMenu.create("pasteInToNewLayer"),
            EditMenu.create("pasteInToNewImage"),
            new VerticalSeparator(),
            EditMenu.create("copySelection"),
            EditMenu.create("pasteSelection")
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
            "app:update_active_document",
            "app:selection_clipboard_changed"
        );
    }

    static create(id) {
        return ActionRegistry.get("menu.edit." + id).createDropEntry();
    }
}
