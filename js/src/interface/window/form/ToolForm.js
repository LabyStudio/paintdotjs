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

class ToolForm extends Form {

    constructor() {
        super("mainToolBarForm");

        this.app.on("app:active_tool_updated", tool => {
            this.reinitialize();
        });
        this.app.on("app:shortcut_changed", () => {
            this.reinitialize();
        });
    }

    initialize(window) {
        super.initialize(window);
        window.setSize(64, 331);
    }

    initializeDefault(window) {
        window.setAnchor(0, 0)
    }

    buildContent() {
        let grid = super.buildContent();
        grid.id = "toolForm";

        let toolStripChooser = PanelRegistry.get("toolMenu").get("toolStripChooser.chooseToolButton");

        for (let entry of toolStripChooser.entries) {
            let isSelected = entry.id === toolStripChooser.getSelectedId();
            let implemented = ToolType.getById(entry.id) !== null;

            let button = document.createElement("div");
            button.className = "menu-item clickable";
            const toolType = ToolType.getById(entry.id);
            if (toolType !== null) button.title = toolType.getTooltipText();
            button.onclick = () => {
                if (implemented) {
                    toolStripChooser.setSelectedId(entry.id);
                }
            };
            if (isSelected) {
                button.setAttribute("active", "");
            }
            if (!implemented) {
                button.setAttribute("disabled", "");
            }
            {
                let isLargeIcon = entry.id === "shapesTool";
                let icon = document.createElement("img");
                icon.className = isLargeIcon ? " large-icon" : "icon";
                icon.src = isLargeIcon
                    ? "assets/icons/shapes_tool_icon.png"
                    : entry.getIconSrc();
                button.appendChild(icon);
            }
            grid.appendChild(button);
        }

        return grid;
    }

}
