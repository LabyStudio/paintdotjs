class PanelRegistry {

    constructor() {
        PanelRegistry.INSTANCE = this;

        this.panels = {};

        this.register(new MainMenu());
        this.register(new CommonMenu());
    }

    register(panel) {
        this.panels[panel.id] = panel;
        panel.initialize(null);
    }

    unregister(id) {
        delete this.panels[id];
    }

    get(id) {
        return this.panels[id];
    }

    list() {
        return Object.values(this.panels);
    }

    static initialize() {
        new PanelRegistry();
    }
}