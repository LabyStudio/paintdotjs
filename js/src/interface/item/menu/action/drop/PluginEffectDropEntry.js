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

class PluginEffectDropEntry extends DropEntry {

    constructor(action, definition, plugin) {
        super(action.getActionId(), () => action.runPerformAction());
        this.action = action;
        this.definition = definition;
        this.plugin = plugin;
    }

    buildElement() {
        const element = super.buildElement();
        element.classList.add("plugin-effect-entry");
        element.title = this.getPluginTooltip();

        const badgeContainer = element.querySelector(".shortcut");
        badgeContainer.innerHTML = "";
        badgeContainer.classList.add("plugin-effect-badge");
        {
            const badge = document.createElement("img");
            badge.src = "assets/icons/menu_help_plugins_icon.png";
            badge.alt = "Plugin";
            badgeContainer.appendChild(badge);
        }
        return element;
    }

    getText() {
        return this.definition.controls.length === 0
            ? this.definition.displayName
            : `${this.definition.displayName}...`;
    }

    getShortcut() {
        return this.action.getShortcutKey().toString();
    }

    getIconSrc() {
        return BitmapEffectAction.getIconSource(this.definition);
    }

    getPluginTooltip() {
        const lines = [`Plugin: ${this.definition.displayName} v${this.plugin.version}`];
        const author = this.plugin.copyright || this.plugin.author;
        if (author) {
            lines.push(`Author: ${author}`);
        }
        if (this.plugin.description) {
            lines.push(this.plugin.description);
        }
        if (this.plugin.website) {
            lines.push(this.plugin.website);
        }
        if (this.plugin.sourceFileName) {
            lines.push(`Location: ${this.plugin.sourceFileName}`);
        }
        return lines.join("\n");
    }
}
