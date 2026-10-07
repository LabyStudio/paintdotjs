class DropEntry extends ActionItem {

    constructor(id, callback) {
        super(id, callback);
    }

    initialize(parent) {
        super.initialize(parent);
        this.getElement().addEventListener("mouseenter", () => {
            if (!Array.isArray(this.parent?.entries)) return;
            for (const sibling of this.parent.entries) {
                if (sibling !== this && sibling instanceof SubmenuDropEntry) sibling.close();
            }
        });
    }

    onPress(event) {
        if (!this.isEnabled() || this.pressable === null) return;

        // Close before running the command. Dialog actions synchronously add a
        // modal backdrop, which can otherwise intercept the document-level
        // outside-click handler and leave this flyout visible behind it.
        let ancestor = this.parent;
        while (ancestor !== null) {
            if (ancestor instanceof DropMenuItem || ancestor instanceof DropMenuPopup) {
                ancestor.close();
                break;
            }
            ancestor = ancestor.parent;
        }
        super.onPress(event);
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
