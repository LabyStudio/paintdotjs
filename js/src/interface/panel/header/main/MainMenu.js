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

class MainMenu extends StripPanel {
    constructor() {
        super("mainMenu", {
            items: [
                new FileMenu(),
                new EditMenu(),
                new ViewMenu(),
                new ImageMenu(),
                new LayersMenu(),
                new AdjustmentsMenu(),
                new EffectsMenu()
            ]
        });

        this.openDropMenu = null;
    }

    onDropMenuOpening(item) {
        if (this.openDropMenu !== null && this.openDropMenu !== item) {
            this.openDropMenu.close();
        }
        this.openDropMenu = item;
    }

    onDropMenuClosed(item) {
        if (this.openDropMenu === item) {
            this.openDropMenu = null;
        }
    }

    onDropMenuHovered(item) {
        if (this.openDropMenu !== null && this.openDropMenu !== item && item.isEnabled()) {
            item.open();
        }
    }
}
