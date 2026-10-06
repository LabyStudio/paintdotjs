class MainMenu extends StripPanel {
    constructor() {
        super("mainMenu", {
            items: [
                new FileMenu(),
                new EditMenu(),
                new ViewMenu(),
                new ImageMenu(),
                new LayersMenu(),
                new AdjustmentsMenu(),
                new EffectsMenu()
            ]
        });

        this.openDropMenu = null;
    }

    onDropMenuOpening(item) {
        if (this.openDropMenu !== null && this.openDropMenu !== item) {
            this.openDropMenu.close();
        }
        this.openDropMenu = item;
    }

    onDropMenuClosed(item) {
        if (this.openDropMenu === item) this.openDropMenu = null;
    }

    onDropMenuHovered(item) {
        if (this.openDropMenu !== null && this.openDropMenu !== item && item.isEnabled()) {
            item.open();
        }
    }
}
