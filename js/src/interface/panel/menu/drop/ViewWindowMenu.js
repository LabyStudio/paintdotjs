class ViewWindowMenu extends DropMenuItem {
    constructor() {
        super("menu.view", [
            new DropEntry("menu.view.zoomIn", null),
            new DropEntry("menu.view.zoomOut", null),
            new DropEntry("menu.view.zoomToWindow", null),
            new DropEntry("menu.view.zoomToSelection", null),
            new DropEntry("menu.view.actualSize", null),
            new DropSeparator(),
            new DropEntry("menu.view.grid", null),
            new DropEntry("menu.view.rulers", null),
            new DropSeparator(),
            new DropEntry("measurementUnit.pixel", null)
                .withTranslationKey("plural", false)
                .withNoIcon(),
            new DropEntry("measurementUnit.inch", null)
                .withTranslationKey("plural", false)
                .withNoIcon(),
            new DropEntry("measurementUnit.centimeter", null)
                .withTranslationKey("plural", false)
                .withNoIcon()
        ]);
    }
}