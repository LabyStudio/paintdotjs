class EffectsMenu extends DropMenuItem {
    constructor() {
        super("menu.effects", [
            EffectsMenu.createEffect("artistic", null),
            EffectsMenu.createEffect("blurring", null),
            EffectsMenu.createEffect("color", null),
            EffectsMenu.createEffect("distort", null),
            EffectsMenu.createEffect("noise", null),
            EffectsMenu.createEffect("object", null),
            EffectsMenu.createEffect("photo", null),
            EffectsMenu.createEffect("render", null),
            EffectsMenu.createEffect("stylize", null),
        ]);
    }

    static createEffect(id, callback) {
        return new DropEntry("effects." + id + ".submenu", callback)
            .withTranslationKey("name", false)
            .withNoIcon();
    }
}