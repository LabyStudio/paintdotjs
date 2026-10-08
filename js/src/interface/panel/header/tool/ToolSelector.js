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

class ToolSelector extends SelectorMenuItem {

    constructor() {
        super("toolStripChooser.chooseToolButton");

        let toolIds = ToolType.VALUES.map(toolType => toolType.getId());

        // Add the tools to the drop menu
        for (let id of toolIds) {
            let implemented = ToolType.getById(id) !== null;

            let entry = new DropEntry(id, () => {
                if (implemented) {
                    this.setSelectedId(id);
                }
            }).withTranslationKey("name", false);
            entry.setEnabled(implemented);

            // Fix the icon path of the paint bucket and recolor tools
            if (id === "paintBucketTool") {
                entry.withIconPathKey("paint_bucket_icon");
            }
            if (id === "recolorTool") {
                entry.withIconPathKey("recoloring_tool_icon");
            }
            // The compact toolbar and dropdown use Paint.NET's square tool
            // glyph. The Tools window deliberately keeps the wider artwork.
            if (id === "shapesTool") {
                entry.withIconPathKey("shapes_tool_icon_16");
            }

            this.add(entry);
        }

        const defaultToolId = typeof AppSettingsStore === "undefined"
            ? "paintBrushTool"
            : AppSettingsStore.get("tools.defaultTool", "paintBrushTool");
        this.setSelectedId(ToolType.getById(defaultToolId) === null ? "paintBrushTool" : defaultToolId);

        this.app.on("app:shortcut_changed", () => this.reinitialize());
    }

    buildElement() {
        const element = super.buildElement();
        const type = ToolType.getById(this.getSelectedId());
        if (type !== null) element.title = type.getTooltipText();
        return element;
    }

    setSelectedId(id) {
        super.setSelectedId(id);

        let tool = ToolType.getById(id);
        if (tool === null) {
            throw new Error("Tool not found: " + id);
        }
        this.app.setActiveToolFromType(tool);
    }
}
