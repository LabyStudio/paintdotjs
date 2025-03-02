class CommonMenu extends StripPanel {

    constructor() {
        super("commonMenu", {
            items: [
                CommonMenu.ref("menu.file", "new"),
                CommonMenu.ref("menu.file", "open"),
                CommonMenu.ref("menu.file", "save"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.file", "print"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.edit", "cut"),
                CommonMenu.ref("menu.edit", "copy"),
                CommonMenu.ref("menu.edit", "paste"),
                CommonMenu.ref("menu.image", "crop"),
                CommonMenu.ref("menu.edit", "deselect"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.edit", "undo"),
                CommonMenu.ref("menu.edit", "redo"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.view", "grid"),
                CommonMenu.ref("menu.view", "rulers"),
            ]
        });
    }

    static ref(menu, item, callback = null) {
        let mainMenu = PanelRegistry.get("mainMenu");
        let dropEntry = mainMenu.get(menu).get(menu + "." + item)
        return IconItem.fromActionItem(dropEntry);
    }
}