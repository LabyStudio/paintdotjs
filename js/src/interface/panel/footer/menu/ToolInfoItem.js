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

class ToolInfoItem extends LabelMenuItem {

    constructor() {
        super("toolInfoItem");

        this.app.on("app:active_tool_updated", tool => {
            this.reinitialize();
        });
    }

    getSelectedTool() {
        let selector = PanelRegistry.get("toolMenu").get("toolStripChooser.chooseToolButton");
        return selector.getSelectedEntry();
    }

    getIconPath() {
        return this.getSelectedTool().getIconPath();
    }

    getText() {
        let selectedTool = this.getSelectedTool();
        let helpText = i18n(selectedTool.id + ".helpText");
        if (typeof helpText !== "string") {
            helpText = i18n(selectedTool.id + ".helpText.text");
        }
        return i18n(selectedTool.getText()) + ": " + helpText;
    }

}