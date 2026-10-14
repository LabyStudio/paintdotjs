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

class EffectsMenu extends DropMenuItem {

    static CATEGORIES = Object.freeze({
        artistic: ["inkSketchEffect", "oilPaintingEffect", "pencilSketchEffect"],
        blurring: [
            "blurEffect", "bokehEffect", "fragmentEffect", "medianBlurEffect", "motionBlurEffect",
            "radialBlurEffect", "reduceNoiseEffect", "sketchBlurEffect", "squareBlurEffect",
            "surfaceBlurEffect", "unfocusEffect", "zoomBlurEffect"
        ],
        color: ["quantizeEffect"],
        distort: [
            "bulgeEffect", "crystalizeEffect", "dentsEffect", "pixelateEffect", "polarInversion",
            "tileEffect", "turbulenceEffect", "twistEffect"
        ],
        noise: ["addNoiseEffect", "frostedGlassEffect", "medianEffect"],
        object: ["dropShadowEffect", "morphologyEffect", "outlineEffect"],
        photo: [
            "glowEffect", "redEyeRemoveEffect", "sharpenEffect", "softenPortraitEffect",
            "straightenEffect", "vignetteEffect"
        ],
        render: ["cloudsEffect", "juliaFractalEffect", "mandelbrotFractalEffect"],
        stylize: ["edgeDetectEffect", "embossEffect", "reliefEffect"]
    });

    constructor() {
        const effectEntries = Object.entries(EffectsMenu.CATEGORIES).map(([category, effects]) =>
            EffectsMenu.createCategory(category, effects)
        );
        super("menu.effects", effectEntries);

        this.builtInEffectEntries = effectEntries;
        this.effectEntries = effectEntries;
        this.repeatEntry = ActionRegistry.get("menu.effects.repeat").createDropEntry();
        this.repeatEntry.getIconPath = () => {
            const last = BitmapEffectAction.getLastEffect();
            return last === null ? "effect_icon.png" : last.definition.icon;
        };
        this.repeatSeparator = new VerticalSeparator();

        this.updateEntriesOn(
            "app:update_active_document",
            "document:active_layer_changed",
            "document:effect_applied"
        );
    }

    open() {
        const pluginEntry = EffectsMenu.createPluginCategory();
        this.effectEntries = pluginEntry === null
            ? this.builtInEffectEntries
            : [...this.builtInEffectEntries, pluginEntry];
        const hasLastEffect = BitmapEffectAction.getLastEffect() !== null;
        this.entries = hasLastEffect
            ? [this.repeatEntry, this.repeatSeparator, ...this.effectEntries]
            : this.effectEntries;
        super.open();
    }

    static createPluginCategory() {
        const plugins = PluginManager.getRuntimePlugins();
        if (plugins.length === 0) {
            return null;
        }
        const pluginEntries = plugins.map(plugin => {
            const effects = plugin.effects.map(definition => {
                const action = ActionRegistry.get(definition.actionId);
                if (action === null) {
                    throw new Error("Missing plugin effect action: " + definition.actionId);
                }
                return action.createDropEntry()
                    .withIconPathKey(definition.icon.replace(/\.png$/, ""));
            });
            const entry = new SubmenuDropEntry(
                "effects.plugins." + plugin.id + ".submenu",
                effects
            ).withNoIcon();
            entry.getText = () => plugin.name;
            return entry;
        });
        const entry = new SubmenuDropEntry("effects.plugins.submenu", pluginEntries)
            .withNoIcon();
        entry.getText = () => "Plugins";
        return entry;
    }

    static createCategory(category, effectIds) {
        const entries = effectIds.map(id => {
            const actionId = "menu.effects." + id;
            const action = ActionRegistry.get(actionId);
            if (action === null) {
                throw new Error("Missing effect action: " + actionId);
            }
            return action.createDropEntry()
                .withTranslationKey(id + ".name")
                .withIconPathKey(BitmapEffectEngine.EFFECTS[id].icon.replace(/\.png$/, ""));
        });
        return new SubmenuDropEntry("effects." + category + ".submenu", entries)
            .withTranslationKey("name", false)
            .withNoIcon();
    }
}
