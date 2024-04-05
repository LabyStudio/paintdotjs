class DropEntry extends ActionItem {

    constructor(id, callback) {
        super(id, callback);
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " drop-entry";
        element.innerHTML = "";
        {
            // Icon
            let icon = document.createElement("img");
            icon.className = "icon";
            if (this.hasIconImage) {
                icon.src = this.getIconSrc();
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

    getIconSrc() {
        return "assets/icons/" + this.getIconPath();
    }
}