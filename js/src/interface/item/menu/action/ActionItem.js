class ActionItem extends MenuItem {

    constructor(id, callback = null) {
        super(id, callback);

        this.hasIconImage = true;

        this.translationKey = "text";
        this.absoluteTranslationKey = false;
        this.iconPathKey = "icon";
        this.absoluteIconPathKey = false;

        // Implemented UI actions automatically join the command registry.
        // Menus, toolbars, keyboard dispatch, and the shortcut editor then all
        // invoke the exact same callback instead of maintaining parallel maps.
        if (id !== null && callback !== null) {
            ActionRegistry.registerCallback(
                id,
                () => {
                    if (this.pressable !== null) this.pressable();
                },
                () => this.getText(),
                () => this.isEnabled()
            );
        }
    }

    withNoIcon() {
        this.hasIconImage = false;
        return this;
    }

    buildElement() {
        const element = super.buildElement();
        const action = this.getAsAction();
        if (action !== null) {
            const tooltip = action.getTooltipText();
            if (tooltip !== null) element.title = tooltip;
        }
        return element;
    }

    withTranslationKey(translationKey, absolute = true) {
        this.translationKey = translationKey;
        this.absoluteTranslationKey = absolute;
        return this;
    }

    withIconPathKey(iconPathKey, absolute = true) {
        this.iconPathKey = iconPathKey;
        this.absoluteIconPathKey = absolute;
        this.hasIconImage = true;
        return this;
    }

    getIconPath() {
        if (this.absoluteIconPathKey) {
            return this.iconPathKey + ".png";
        }
        return this.id.replaceAll(".", "_")
            .replace(/([A-Z])/g, "_$1")
            .toLowerCase() + "_" + this.iconPathKey + ".png";
    }

    hasIcon() {
        return this.hasIconImage;
    }

    getText() {
        return i18n(this.absoluteTranslationKey ? this.translationKey : (this.id + "." + this.translationKey));
    }

    getShortcut() {
        const action = this.getAsAction();
        return action === null ? null : action.getShortcutKey().toString();
    }

}
