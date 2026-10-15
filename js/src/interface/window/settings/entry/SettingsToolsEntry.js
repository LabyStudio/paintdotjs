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

class SettingsToolsEntry extends SettingsEntry {

    render() {
        this.addHeading("Tools", "Choose the defaults that are used when paint.js starts.");
        const choices = ToolType.VALUES.map(type => [type.getId(), type.getName()]);
        this.addSelect("tools.defaultTool", "Default tool:", choices);
        this.addSectionHeading("Tool defaults");
        this.addNote("Tool-specific options are saved automatically as you use them.");
        this.addButton("Reset tool settings", () => {
            for (const type of ToolType.VALUES) {
                type.resetSettings();
            }
            this.setStatus("Tool settings were reset to their defaults.");
            const active = window.app?.getActiveTool?.();
            if (active !== null && active !== undefined) {
                window.app.setActiveToolFromType(active.getType());
            }
        });
    }
}
