class CommonMenu extends StripPanel {

    constructor() {
        super("commonMenu", {
            items: [
                CommonMenu.ref("menu.file", "menu.file.new"),
                CommonMenu.ref("menu.file", "menu.file.open"),
                CommonMenu.ref("menu.file", "menu.file.save"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.file", "menu.file.print"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.edit", "menu.edit.cut"),
                CommonMenu.ref("menu.edit", "menu.edit.copy"),
                CommonMenu.ref("menu.edit", "menu.edit.paste"),
                CommonMenu.ref("menu.image", "menu.image.crop"),
                CommonMenu.ref("menu.edit", "menu.edit.deselect"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.edit", "menu.edit.undo"),
                CommonMenu.ref("menu.edit", "menu.edit.redo"),
                new HorizontalSeparator(),
                CommonMenu.ref("menu.view", "menu.view.grid"),
                CommonMenu.ref("menu.view", "menu.view.rulers"),
            ]
        });
    }

    static ref(menu, item) {
        let mainMenu = PanelRegistry.INSTANCE.get("mainMenu");
        let dropEntry = mainMenu.get(menu).get(item)
        return IconItem.fromActionItem(dropEntry);
    }
}