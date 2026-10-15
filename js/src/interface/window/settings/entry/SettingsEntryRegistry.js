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

class SettingsEntryRegistry {

    static groups = Object.freeze([
        {
            id: "standard",
            label: null,
            entries: Object.freeze([
                {id: "ui", label: "User Interface", icon: "settings_u_i_24.png", type: SettingsUserInterfaceEntry},
                {id: "canvas", label: "Canvas", icon: "settings_canvas_24.png", type: SettingsCanvasEntry},
                {id: "tools", label: "Tools", icon: "settings_tools_24.png", type: SettingsToolsEntry},
                {id: "pen", label: "Pen & Tablet", icon: "settings_pen_and_tablet_24.png", type: SettingsPenEntry},
                {id: "graphics", label: "Graphics", icon: "settings_graphics_24.png", type: SettingsGraphicsEntry},
                {id: "colorManagement", label: "Color Management", icon: "settings_color_management_24.png", type: SettingsColorManagementEntry},
                {id: "updates", label: "Updates", icon: "settings_updates_24.png", type: SettingsUpdatesEntry},
                {id: "diagnostics", label: "Diagnostics", icon: "settings_diagnostics_24.png", type: SettingsDiagnosticsEntry}
            ])
        },
        {
            id: "paintjs",
            label: "paint.js specific",
            entries: Object.freeze([
                {id: "fonts", label: "Fonts", icon: "text_tool_icon.png", type: SettingsFontsEntry},
                {id: "shapes", label: "Shapes", icon: "shapes_tool_icon.png", type: SettingsShapesEntry},
                {id: "assets", label: "Icon Packs", icon: "menu_file_open_icon.png", type: SettingsIconPacksEntry},
                {id: "keyboard", label: "Keyboard Shortcuts", icon: "menu_utilities_settings_icon.png", type: SettingsKeyboardEntry},
                {id: "plugins", label: "Plugins", icon: "settings_plugins_24.png", type: SettingsPluginsEntry}
            ])
        }
    ]);

    static entries = Object.freeze(this.groups.flatMap(group => group.entries));

    static find(id) {
        return this.entries.find(entry => entry.id === id) || this.entries[0];
    }

    static create(dialog, id) {
        const definition = this.find(id);
        return new definition.type(dialog, definition);
    }
}
