class IconItem extends ActionItem {

    constructor(id, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " icon-item";
        element.innerHTML = "";
        {
            let icon = document.createElement("img");
            icon.className = "icon";
            if (this.isImplemented()) {
                icon.setAttribute("title", this.getText());
            }
            if (this.hasIcon()) {
                icon.src = "assets/icons/" + this.getIconPath();
                icon.onerror = event => {
                    icon.style.opacity = '0';
                }
            } else {
                icon.style.opacity = '0';
            }
            element.appendChild(icon);
        }
        return element;
    }

    static fromActionItem(actionItem) {
        let iconItem = new IconItem(actionItem.id, actionItem.callback);
        iconItem.hasIconImage = actionItem.hasIconImage;
        iconItem.translationKey = actionItem.translationKey;
        iconItem.absoluteTranslationKey = actionItem.absoluteTranslationKey;
        iconItem.iconPathKey = actionItem.iconPathKey;
        iconItem.absoluteIconPathKey = actionItem.absoluteIconPathKey;
        return iconItem;
    }
}