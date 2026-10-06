class AdjustmentsMenu extends DropMenuItem {

    constructor() {
        super("menu.layers.adjustments", [
            AdjustmentsMenu.createAdjustment("autoLevel"),
            AdjustmentsMenu.createAdjustment("desaturateEffect"),
            AdjustmentsMenu.createAdjustment("brightnessAndContrastAdjustment"),
            AdjustmentsMenu.createAdjustment("curvesEffect"),
            AdjustmentsMenu.createAdjustment("exposureEffect"),
            AdjustmentsMenu.createAdjustment("highlightsAndShadowsEffect"),
            AdjustmentsMenu.createAdjustment("hueAndSaturationAdjustment"),
            AdjustmentsMenu.createAdjustment("invertAlphaEffect"),
            AdjustmentsMenu.createAdjustment("invertColorsEffect"),
            AdjustmentsMenu.createAdjustment("levelsEffect"),
            AdjustmentsMenu.createAdjustment("posterizeAdjustment"),
            AdjustmentsMenu.createAdjustment("sepiaEffect"),
            AdjustmentsMenu.createAdjustment("temperatureAndTintEffect"),
        ]);

        this.updateEntriesOn("app:update_active_document", "document:active_layer_changed");
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
