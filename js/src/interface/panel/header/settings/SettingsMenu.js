class SettingsMenu extends StripPanel {

    constructor() {
        super("settingsMenu", {
            items: [
                new IconItem("menu.help", null),
                new IconItem("menu.settings", null)
                    .withIconPathKey("menu_utilities_settings_icon"),
                new HorizontalSeparator(),
                new IconItem("menu.window.colors", null),
                new IconItem("menu.window.layers", null),
                new IconItem("menu.window.history", null),
                new IconItem("menu.window.tools", null)
                    .withIconPathKey("settings_tools16")
            ]
        });
    }

}