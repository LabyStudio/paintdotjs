class MeasurementUnitSelectorItem extends SelectorMenuItem {

    constructor() {
        super("measurementUnit");

        let unitIds = [
            "pixel",
            "inch",
            "centimeter"
        ]

        // Add the tools to the drop menu
        for (let id of unitIds) {
            let entry = new DropEntry(this.id + "." + id, () => {
                this.setSelectedId(this.id + "." + id);
                this.app.setMeasurementUnit(id);
            }).withTranslationKey("plural", false)
                .withNoIcon();

            this.add(entry);
        }

        this.setSelectedId(this.id + ".pixel");
    }

    run(event) {
        let separator = this.element.children[0];
        if (event.clientX >= separator.getBoundingClientRect().right) {
            super.run(event);
        } else {
            this.selectNextEntry();
        }
    }

    isDropUp() {
        return true;
    }

    showSelectedIcon() {
        return false;
    }

    setSelectedId(id) {
        super.setSelectedId(id);

        // Hide check icon for all
        for (let entry of this.entries) {
            entry.withNoIcon();
        }

        // Show check icon for selected
        let selected = this.getSelectedEntry();
        if (selected === null) {
            return;
        }
        selected.withIconPathKey("tool_strip_checked", true);
    }

    getText() {
        let selected = this.getSelectedEntry();
        return i18n(selected.id + ".abbreviation");
    }
}