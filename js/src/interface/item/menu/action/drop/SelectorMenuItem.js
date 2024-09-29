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
            if (selectedEntry != null && selectedEntry.hasIcon() && this.showSelectedIcon()) {
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

    selectNextEntry() {
        let index = this.entries.indexOf(this.getSelectedEntry());
        let nextIndex = (index + 1) % this.entries.length;
        this.setSelectedId(this.entries[nextIndex].id);
    }

    setSelectedId(id) {
        this.selected = id;
        this.reinitialize();
    }

    showSelectedIcon() {
        return true;
    }
}