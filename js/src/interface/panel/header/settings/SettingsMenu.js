class SettingsMenu extends StripPanel {

    constructor() {
        super("settingsMenu", {
            items: [
                new IconItem("menu.help", null),
                new IconItem("menu.settings", null)
                    .withIconPathKey("menu_utilities_settings_icon"),
                new HorizontalSeparator(),
                new ToggleFormItem("menu.window.colors", "colorsForm"),
                new ToggleFormItem("menu.window.layers", "layerForm"),
                new ToggleFormItem("menu.window.history", "historyForm"),
                new ToggleFormItem("menu.window.tools", "mainToolBarForm")
                    .withIconPathKey("settings_tools16")
            ]
        });
    }

}