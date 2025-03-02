class LayersMenu extends DropMenuItem {
    constructor() {
        super("menu.layers", [
            LayersMenu.create("add.new.layer"),
            LayersMenu.create("delete.layer"),
            LayersMenu.create("duplicate.layer"),
            LayersMenu.create("merge.layer.down"),
            LayersMenu.create("toggle.layer.visibility"),
            new VerticalSeparator(),
            new DropEntry("menu.layers.importFromFile", null),
            new VerticalSeparator(),
            new DropEntry("menu.layers.flipHorizontal", null),
            new DropEntry("menu.layers.flipVertical", null),
            new DropEntry("menu.layers.rotate180", null),
            new DropEntry("menu.layers.rotateZoom", null)
                .withTranslationKey("rotateZoomEffect.name"),
            new VerticalSeparator(),
            new DropEntry("menu.layers.goToTopLayer", null),
            new DropEntry("menu.layers.goToLayerAbove", null),
            new DropEntry("menu.layers.goToLayerBelow", null),
            new DropEntry("menu.layers.goToBottomLayer", null),
            new VerticalSeparator(),
            LayersMenu.create("move.layer.to.top"),
            LayersMenu.create("move.layer.up"),
            LayersMenu.create("move.layer.down"),
            LayersMenu.create("move.layer.to.bottom"),
            new VerticalSeparator(),
            new DropEntry("menu.layers.layerProperties", null),
        ]);

        this.updateEntriesOn("document:invalidated");
    }

    static create(id) {
        return ActionRegistry.get("menu.layers." + id).createDropEntry();
    }
}