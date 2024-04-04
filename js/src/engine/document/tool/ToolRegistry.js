class ToolRegistry {

    static {
        ToolRegistry.tools = {};
    }

    static initialize() {
        // Register all tools
        ToolRegistry.register(new PanTool());

        // Set default tool
        let selectedToolId = PanelRegistry.get("toolMenu")
            .get("toolStripChooser.chooseToolButton")
            .getSelectedId();
        let defaultTool = this.get(selectedToolId);
        app.setActiveTool(defaultTool);
    }

    static register(tool) {
        this.tools[tool.id] = tool;
    }

    static get(id) {
        return this.tools[id] || null;
    }
}