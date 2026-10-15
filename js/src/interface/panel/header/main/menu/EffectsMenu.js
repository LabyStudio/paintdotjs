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
        const effectEntries = EffectsMenu.createEffectEntries();
        super("menu.effects", effectEntries);

        this.effectEntries = effectEntries;
        this.repeatEntry = ActionRegistry.get("menu.effects.repeat").createDropEntry();
        this.repeatEntry.getIconSrc = () => {
            const last = BitmapEffectAction.getLastEffect();
            return last === null
                ? "assets/icons/effect_icon.png"
                : BitmapEffectAction.getIconSource(last.definition);
        };
        this.repeatSeparator = new VerticalSeparator();

        this.updateEntriesOn(
            "app:update_active_document",
            "document:active_layer_changed",
            "document:effect_applied"
        );
    }

    open() {
        this.effectEntries = EffectsMenu.createEffectEntries();
        const hasLastEffect = BitmapEffectAction.getLastEffect() !== null;
        this.entries = hasLastEffect
            ? [this.repeatEntry, this.repeatSeparator, ...this.effectEntries]
            : this.effectEntries;
        super.open();
    }

    static createEffectEntries() {
        const pluginEffects = new Map();
        for (const plugin of PluginManager.getRuntimePlugins()) {
            for (const definition of plugin.effects) {
                if (definition.menu !== "Effects") {
                    continue;
                }
                const category = EffectsMenu.normalizeCategory(definition.category);
                const effects = pluginEffects.get(category.key) || [];
                effects.push({plugin, definition});
                pluginEffects.set(category.key, effects);
            }
        }

        const categories = Object.entries(EffectsMenu.CATEGORIES).map(([category, effects]) => ({
            label: i18n(`effects.${category}.submenu.name`),
            entry: EffectsMenu.createCategory(
                category, effects, pluginEffects.get(category) || []
            )
        }));
        for (const [key, effects] of pluginEffects) {
            if (key === "root" || Object.hasOwn(EffectsMenu.CATEGORIES, key)) {
                continue;
            }
            const label = EffectsMenu.normalizeCategory(effects[0].definition.category).label;
            categories.push({
                label,
                entry: EffectsMenu.createPluginOnlyCategory(key, label, effects)
            });
        }
        categories.sort((left, right) => EffectsMenu.compareNames(left.label, right.label));

        const entries = categories.map(category => category.entry);
        const rootEffects = pluginEffects.get("root") || [];
        if (rootEffects.length !== 0) {
            entries.push(new VerticalSeparator());
            entries.push(...EffectsMenu.createPluginEntries(rootEffects));
        }
        return entries;
    }

    static createCategory(category, effectIds, pluginEffects = []) {
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
        entries.push(...EffectsMenu.createPluginEntries(pluginEffects));
        entries.sort((left, right) => EffectsMenu.compareNames(left.getText(), right.getText()));
        return new SubmenuDropEntry("effects." + category + ".submenu", entries)
            .withTranslationKey("name", false)
            .withNoIcon();
    }

    static createPluginOnlyCategory(key, label, effects) {
        const entry = new SubmenuDropEntry(
            `effects.plugins.${key}.submenu`, EffectsMenu.createPluginEntries(effects)
        ).withNoIcon();
        entry.getText = () => label;
        return entry;
    }

    static createPluginEntries(effects) {
        return effects.map(({plugin, definition}) => {
            const action = ActionRegistry.get(definition.actionId);
            if (action === null) {
                throw new Error("Missing plugin effect action: " + definition.actionId);
            }
            return new PluginEffectDropEntry(action, definition, plugin);
        }).sort((left, right) => EffectsMenu.compareNames(left.getText(), right.getText()));
    }

    static normalizeCategory(value) {
        const label = typeof value === "string" && value.trim() !== ""
            ? value.trim()
            : "Plugins";
        const aliases = {
            artistic: "artistic",
            blurring: "blurring",
            blurs: "blurring",
            color: "color",
            distort: "distort",
            noise: "noise",
            object: "object",
            photo: "photo",
            render: "render",
            stylize: "stylize",
            root: "root"
        };
        const normalized = label.toLocaleLowerCase().replace(/\s+/g, " ");
        return {
            key: aliases[normalized] || normalized.replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "plugins",
            label
        };
    }

    static compareNames(left, right) {
        return left.replace(/\.\.\.$/, "").localeCompare(
            right.replace(/\.\.\.$/, ""), undefined, {sensitivity: "base"}
        );
    }
}
