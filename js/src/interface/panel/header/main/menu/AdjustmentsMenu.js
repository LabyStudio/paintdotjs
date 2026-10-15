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

class AdjustmentsMenu extends DropMenuItem {

    static ADJUSTMENTS = [
        "autoLevel",
        "desaturateEffect",
        "brightnessAndContrastAdjustment",
        "curvesEffect",
        "exposureEffect",
        "highlightsAndShadowsEffect",
        "hueAndSaturationAdjustment",
        "invertAlphaEffect",
        "invertColorsEffect",
        "levelsEffect",
        "posterizeAdjustment",
        "sepiaEffect",
        "temperatureAndTintEffect"
    ];

    constructor() {
        super("menu.layers.adjustments", AdjustmentsMenu.createEntries());

        this.updateEntriesOn("app:update_active_document", "document:active_layer_changed");
    }

    open() {
        this.entries = AdjustmentsMenu.createEntries();
        super.open();
    }

    static createEntries() {
        const rootEntries = AdjustmentsMenu.ADJUSTMENTS.map(id =>
            AdjustmentsMenu.createAdjustment(id));
        const categories = new Map();
        for (const plugin of PluginManager.getRuntimePlugins()) {
            for (const definition of plugin.effects) {
                if (definition.menu !== "Adjustments") {
                    continue;
                }
                const descriptor = {plugin, definition};
                if (definition.category.toLocaleLowerCase() === "root") {
                    rootEntries.push(AdjustmentsMenu.createPluginEntry(descriptor));
                    continue;
                }
                const label = definition.category;
                const key = label.toLocaleLowerCase();
                const category = categories.get(key) || {label, effects: []};
                category.effects.push(descriptor);
                categories.set(key, category);
            }
        }
        rootEntries.sort((left, right) => AdjustmentsMenu.compareNames(
            left.getText(), right.getText()));
        if (categories.size === 0) {
            return rootEntries;
        }
        const categoryEntries = Array.from(categories.entries()).map(([key, category]) => {
            const entries = category.effects.map(descriptor =>
                AdjustmentsMenu.createPluginEntry(descriptor));
            entries.sort((left, right) => AdjustmentsMenu.compareNames(
                left.getText(), right.getText()));
            const submenu = new SubmenuDropEntry(
                `adjustments.plugins.${key.replace(/[^a-z0-9]+/g, "-")}.submenu`, entries
            ).withNoIcon();
            submenu.getText = () => category.label;
            return submenu;
        });
        categoryEntries.sort((left, right) => AdjustmentsMenu.compareNames(
            left.getText(), right.getText()));
        return [...categoryEntries, new VerticalSeparator(), ...rootEntries];
    }

    static createPluginEntry({plugin, definition}) {
        const action = ActionRegistry.get(definition.actionId);
        if (action === null) {
            throw new Error("Missing plugin adjustment action: " + definition.actionId);
        }
        return new PluginEffectDropEntry(action, definition, plugin);
    }

    static compareNames(left, right) {
        return left.replace(/\.\.\.$/, "").localeCompare(
            right.replace(/\.\.\.$/, ""), undefined, {sensitivity: "base"}
        );
    }

    static createAdjustment(id, callback = undefined) {
        if (callback === undefined) {
            return ActionRegistry.get("adjustment." + id).createDropEntry()
                .withIconPathKey(id === "posterizeAdjustment"
                    ? "posterize_effect_icon"
                    : id.replace(/([A-Z])/g, match => `_${match.toLowerCase()}`));
        }
        return new DropEntry(id, callback)
            .withTranslationKey(id + ".name")
            .withIconPathKey(id.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`));
    }
}
