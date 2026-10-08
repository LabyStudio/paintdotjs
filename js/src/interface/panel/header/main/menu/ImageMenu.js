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

class ImageMenu extends DropMenuItem {
    constructor() {
        super("menu.image", [
            ImageMenu.create("crop"),
            ImageMenu.create("resize"),
            ImageMenu.create("canvasSize"),
            new VerticalSeparator(),
            ImageMenu.create("flipHorizontal"),
            ImageMenu.create("flipVertical"),
            new VerticalSeparator(),
            ImageMenu.create("rotate90CW"),
            ImageMenu.create("rotate90CCW"),
            ImageMenu.create("rotate180"),
            new VerticalSeparator(),
            new DropEntry("menu.image.colorProfile", null),
            new VerticalSeparator(),
            ImageMenu.create("flatten"),
        ]);

        this.updateEntriesOn(
            "app:update_active_document",
            "document:selection_changed",
            "document:layers_changed"
        );
    }

    static create(id) {
        return ActionRegistry.get("menu.image." + id).createDropEntry();
    }
}
