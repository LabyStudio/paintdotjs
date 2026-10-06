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
