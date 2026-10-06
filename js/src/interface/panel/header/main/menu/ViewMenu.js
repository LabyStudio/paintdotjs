class ViewMenu extends DropMenuItem {
    constructor() {
        super("menu.view", [
            ViewMenu.create("menu.view.zoomIn"),
            ViewMenu.create("menu.view.zoomOut"),
            ViewMenu.create("menu.view.zoomToWindow"),
            ViewMenu.create("menu.view.zoomToSelection"),
            ViewMenu.create("menu.view.actualSize"),
            new VerticalSeparator(),
            ViewMenu.create("menu.view.grid"),
            ViewMenu.create("menu.view.rulers"),
            new VerticalSeparator(),
            ViewMenu.create("measurementUnit.pixel")
                .withTranslationKey("plural", false)
                .withNoIcon(),
            ViewMenu.create("measurementUnit.inch")
                .withTranslationKey("plural", false)
                .withNoIcon(),
            ViewMenu.create("measurementUnit.centimeter")
                .withTranslationKey("plural", false)
                .withNoIcon()
        ]);

        this.updateEntriesOn(
            "app:update_active_document",
            "document:selection_changed",
            "document:update_viewport",
            "app:update_measurement_unit",
            "app:grid_visibility_changed",
            "app:rulers_visibility_changed"
        );
    }

    open() {
        this.updateMeasurementUnitChecks();
        super.open();
    }

    updateMeasurementUnitChecks() {
        const selectedUnit = this.app.getMeasurementUnit();

        for (const unit of ["pixel", "inch", "centimeter"]) {
            const entry = this.get("measurementUnit." + unit);
            if (entry === undefined) continue;

            const selected = unit === selectedUnit;
            entry.setClassName("checked-drop-entry", selected);

            if (selected) {
                entry.withIconPathKey("tool_strip_checked", true);
            } else {
                entry.withNoIcon();
            }
        }
    }

    static create(id) {
        return ActionRegistry.get(id).createDropEntry();
    }
}
