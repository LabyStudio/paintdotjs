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

class SettingsMenu extends StripPanel {

    constructor() {
        super("settingsMenu", {
            items: [
                new HelpMenu(),
                new IconItem("menu.settings", () => SettingsDialog.open())
                    .withIconPathKey("menu_utilities_settings_icon"),
                new HorizontalSeparator(),
                new ToggleFormItem("menu.window.colors", "colorsForm"),
                new ToggleFormItem("menu.window.layers", "layerForm"),
                new ToggleFormItem("menu.window.history", "historyForm"),
                new ToggleFormItem("menu.window.tools", "mainToolBarForm")
                    .withIconPathKey("settings_tools_16")
            ]
        });
    }

}
