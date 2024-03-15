class ToolRegistry {

    static {
        ToolRegistry.tools = {};
    }

    static initialize() {
        // Register all tools
        ToolRegistry.register(new PanTool());
    }

    static register(tool) {
        this.tools[tool.id] = tool;
    }

    static get(id) {
        return this.tools[id] || null;
    }
}