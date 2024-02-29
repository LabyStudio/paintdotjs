class AdjustmentsMenu extends DropMenuItem {

    constructor() {
        super("menu.layers.adjustments", [
            AdjustmentsMenu.createAdjustment("autoLevel", null),
            AdjustmentsMenu.createAdjustment("desaturateEffect", null),
            AdjustmentsMenu.createAdjustment("brightnessAndContrastAdjustment", null),
            AdjustmentsMenu.createAdjustment("curvesEffect", null),
            AdjustmentsMenu.createAdjustment("exposureEffect", null),
            AdjustmentsMenu.createAdjustment("highlightsAndShadowsEffect", null),
            AdjustmentsMenu.createAdjustment("hueAndSaturationAdjustment", null),
            AdjustmentsMenu.createAdjustment("invertAlphaEffect", null),
            AdjustmentsMenu.createAdjustment("invertColorsEffect", null),
            AdjustmentsMenu.createAdjustment("levelsEffect", null),
            AdjustmentsMenu.createAdjustment("posterizeAdjustment", null)
                .withIconPathKey("posterize_effect_icon"),
            AdjustmentsMenu.createAdjustment("sepiaEffect", null),
            AdjustmentsMenu.createAdjustment("temperatureAndTintEffect", null),
        ]);
    }

    static createAdjustment(id, callback) {
        return new DropEntry(id, callback)
            .withTranslationKey(id + ".name")
            .withIconPathKey(id.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`));
    }
}