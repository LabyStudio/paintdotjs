/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

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
        this.app.on("app:update_measurement_unit", unit => {
            const selectedId = this.id + "." + unit;
            if (this.getSelectedId() !== selectedId) this.setSelectedId(selectedId);
        });
    }

    onPress(event) {
        let separator = this.element.children[0];
        if (event.clientX >= separator.getBoundingClientRect().right) {
            super.onPress(event);
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
