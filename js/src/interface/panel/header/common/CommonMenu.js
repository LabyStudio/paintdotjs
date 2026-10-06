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

        const update = () => {
            this.updateItemsEnabledState();
            this.updateToggleStates();
        };
        for (const event of [
            "app:update_active_document",
            "document:dirty_changed",
            "document:history_changed",
            "document:selection_changed",
            "document:layers_changed",
            "document:active_layer_changed",
            "app:grid_visibility_changed",
            "app:rulers_visibility_changed"
        ]) {
            this.app.on(event, update);
        }
    }

    initialize(parent) {
        super.initialize(parent);
        this.updateToggleStates();
    }

    updateToggleStates() {
        const grid = this.get("menu.view.grid");
        const rulers = this.get("menu.view.rulers");
        if (grid !== undefined) grid.setActive(this.app.isGridVisible());
        if (rulers !== undefined) rulers.setActive(this.app.isRulersVisible());
    }

    static ref(menu, item, callback = null) {
        let mainMenu = PanelRegistry.get("mainMenu");
        let dropEntry = mainMenu.get(menu).get(menu + "." + item)
        return IconItem.fromActionItem(dropEntry);
    }
}
