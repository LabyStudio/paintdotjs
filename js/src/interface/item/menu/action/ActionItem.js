class ActionItem extends MenuItem {

    constructor(id, callback) {
        super(id, callback);

        this.hasIcon = true;

        this.translationKey = "text";
        this.absoluteTranslationKey = false;
        this.iconPathKey = "icon";
        this.absoluteIconPathKey = false;
    }

    withNoIcon() {
        this.hasIcon = false;
        return this;
    }

    withTranslationKey(translationKey, absolute = true) {
        this.translationKey = translationKey;
        this.absoluteTranslationKey = absolute;
        return this;
    }

    withIconPathKey(iconPathKey, absolute = true) {
        this.iconPathKey = iconPathKey;
        this.absoluteIconPathKey = absolute;
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

    getText() {
        return i18n(this.absoluteTranslationKey ? this.translationKey : (this.id + "." + this.translationKey));
    }

    getShortcut() {
        return null;
    }

}