class WindowMenu extends Menu {
    constructor() {
        super("menu", {
            items: [
                new FileWindowMenu(),
                new EditWindowMenu(),
                new ViewWindowMenu(),
                new ImageWindowMenu(),
                new LayersWindowMenu(),
                new AdjustmentsWindowMenu(),
                new EffectsWindowMenu()
            ]
        });
    }
}