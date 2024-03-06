class SelectorMenuItem extends DropMenuItem {

    constructor(id, entries = []) {
        super(id, entries);

        this.selected = null;
    }

    buildElement() {
        let selectedEntry = this.getSelectedEntry();

        let element = super.buildElement();
        element.className += " selector";
        {
            // Icon
            if (selectedEntry.hasIcon()) {
                let icon = document.createElement("img");
                icon.className = "icon";
                icon.src = "assets/icons/" + selectedEntry.getIconPath();
                element.appendChild(icon);
            }

            // Separator
            let separator = document.createElement("div");
            separator.className = "separator";
            element.appendChild(separator);

            // Arrow
            let arrow = document.createElement("div");
            arrow.className = this.isDropUp() ? "arrow-up" : "arrow-down";
            element.appendChild(arrow);
        }
        return element;
    }

    getSelectedId() {
        return this.selected;
    }

    getSelectedEntry() {
        for (let entry of this.entries) {
            if (entry.id === this.selected) {
                return entry;
            }
        }
        return this.entries.length === 0 ? null : this.entries[0];
    }

    setSelectedId(id) {
        this.selected = id;
        this.updateDocument();
    }
}