class DropEntry extends MenuItem {

    constructor(id, callback) {
        super(id, callback);

        this.hasIcon = true;

        this.translationKey = "text";
        this.absoluteTranslationKey = false;
        this.iconPathKey = "icon";
        this.absoluteIconPathKey = false;
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " drop-entry";
        element.innerHTML = "";
        {
            // Icon
            let icon = document.createElement("img");
            icon.className = "icon";
            if (this.hasIcon) {
                icon.src = "assets/icons/" + this.getIconPath();
                icon.onerror = event => {
                    icon.style.opacity = '0';
                }
            } else {
                icon.style.opacity = '0';
            }
            element.appendChild(icon);

            // Label
            let label = document.createElement("div");
            label.className = "text";
            label.innerHTML = this.getText();
            element.appendChild(label);

            // Shortcut
            let shortcut = document.createElement("div");
            shortcut.className = "shortcut";
            shortcut.innerHTML = this.getShortcut() || "";
            element.appendChild(shortcut);
        }
        return element;
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