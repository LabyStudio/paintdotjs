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
        super("menu.effects", Object.entries(EffectsMenu.CATEGORIES).map(([category, effects]) =>
            EffectsMenu.createCategory(category, effects)
        ));
        this.updateEntriesOn("app:update_active_document", "document:active_layer_changed");
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
