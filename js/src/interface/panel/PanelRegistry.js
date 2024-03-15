class PanelRegistry {

    static {
        this.panels = {};
    }

    static initialize() {
        PanelRegistry.register(new MainMenu());
        PanelRegistry.register(new CommonMenu());
        PanelRegistry.register(new SettingsMenu());
        PanelRegistry.register(new ToolMenu());
        PanelRegistry.register(new FooterMenu());
    }

    static register(panel) {
        this.panels[panel.id] = panel;
        panel.initialize(null);
    }

    static unregister(id) {
        delete this.panels[id];
    }

    static get(id) {
        return this.panels[id];
    }

    static list() {
        return Object.values(this.panels);
    }
}