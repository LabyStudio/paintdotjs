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

class PanelRegistry {

    static {
        this.panels = {};
    }

    static initialize() {
        PanelRegistry.register(new MainMenu());
        PanelRegistry.register(new DocumentStrip());
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