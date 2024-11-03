class ToolForm extends Form {

    constructor() {
        super("mainToolBarForm");

        this.app.on("app:active_tool_updated", tool => {
            this.reinitialize();
        });
    }

    initialize(window) {
        super.initialize(window);
        window.setSize(50, 284);
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

            let button = document.createElement("div");
            button.className = "menu-item clickable";
            button.onclick = () => {
                toolStripChooser.setSelectedId(entry.id);
            };
            if (isSelected) {
                button.setAttribute("active", "");
            }
            {
                let isLargeIcon = entry.id === "shapesTool";
                let icon = document.createElement("img");
                icon.className = isLargeIcon ? " large-icon" : "icon";
                icon.src = entry.getIconSrc();
                button.appendChild(icon);
            }
            grid.appendChild(button);
        }

        return grid;
    }

}