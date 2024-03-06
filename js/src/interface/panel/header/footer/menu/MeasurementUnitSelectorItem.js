class MeasurementUnitSelectorItem extends SelectorMenuItem {

    constructor() {
        super("measurementUnit");

        this.setSelectedId("pixel");

        let unitIds = [
            "pixel",
            "inch",
            "centimeter"
        ]

        // Add the tools to the drop menu
        for (let id of unitIds) {
            let entry = new DropEntry("measurementUnit." + id, () => {
                this.setSelectedId("measurementUnit." + id);
            }).withTranslationKey("plural", false)
                .withNoIcon();

            this.add(entry);
        }
    }

    isDropUp() {
        return true;
    }

    getText() {
        let selected = this.getSelectedEntry();
        return i18n(selected.id + ".abbreviation");
    }
}