class EffectsWindowMenu extends DropMenuItem {
    constructor() {
        super("menu.effects", [
            EffectsWindowMenu.createEffect("artistic", null),
            EffectsWindowMenu.createEffect("blurring", null),
            EffectsWindowMenu.createEffect("color", null),
            EffectsWindowMenu.createEffect("distort", null),
            EffectsWindowMenu.createEffect("noise", null),
            EffectsWindowMenu.createEffect("object", null),
            EffectsWindowMenu.createEffect("photo", null),
            EffectsWindowMenu.createEffect("render", null),
            EffectsWindowMenu.createEffect("stylize", null),
        ]);
    }

    static createEffect(id, callback) {
        return new DropEntry("effects." + id + ".submenu", callback)
            .withTranslationKey("name", false)
            .withNoIcon();
    }
}