class AdjustmentsWindowMenu extends DropMenuItem {

    constructor() {
        super("menu.layers.adjustments", [
            AdjustmentsWindowMenu.createAdjustment("autoLevel", null),
            AdjustmentsWindowMenu.createAdjustment("desaturateEffect", null),
            AdjustmentsWindowMenu.createAdjustment("brightnessAndContrastAdjustment", null),
            AdjustmentsWindowMenu.createAdjustment("curvesEffect", null),
            AdjustmentsWindowMenu.createAdjustment("exposureEffect", null),
            AdjustmentsWindowMenu.createAdjustment("highlightsAndShadowsEffect", null),
            AdjustmentsWindowMenu.createAdjustment("hueAndSaturationAdjustment", null),
            AdjustmentsWindowMenu.createAdjustment("invertAlphaEffect", null),
            AdjustmentsWindowMenu.createAdjustment("invertColorsEffect", null),
            AdjustmentsWindowMenu.createAdjustment("levelsEffect", null),
            AdjustmentsWindowMenu.createAdjustment("posterizeAdjustment", null)
                .withIconPathKey("posterize_effect_icon"),
            AdjustmentsWindowMenu.createAdjustment("sepiaEffect", null),
            AdjustmentsWindowMenu.createAdjustment("temperatureAndTintEffect", null),
        ]);
    }

    static createAdjustment(id, callback) {
        return new DropEntry(id, callback)
            .withTranslationKey(id + ".name")
            .withIconPathKey(id.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`));
    }
}