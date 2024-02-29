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
    }
}