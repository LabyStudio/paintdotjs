class LayersMenu extends DropMenuItem {
    constructor() {
        super("menu.layers", [
            LayersMenu.create("add.new.layer"),
            LayersMenu.create("delete.layer"),
            LayersMenu.create("duplicate.layer"),
            LayersMenu.create("merge.layer.down"),
            LayersMenu.create("toggle.layer.visibility"),
            new VerticalSeparator(),
            LayersMenu.createAction("menu.layers.importFromFile"),
            new VerticalSeparator(),
            LayersMenu.createAction("menu.layers.flipHorizontal"),
            LayersMenu.createAction("menu.layers.flipVertical"),
            LayersMenu.createAction("menu.layers.rotate180"),
            LayersMenu.createAction("menu.layers.rotateZoom")
                .withTranslationKey("rotateZoomEffect.name")
                .withIconPathKey("menu_layers_rotate_zoom_icon"),
            new VerticalSeparator(),
            LayersMenu.createAction("menu.layers.goToTopLayer"),
            LayersMenu.createAction("menu.layers.goToLayerAbove"),
            LayersMenu.createAction("menu.layers.goToLayerBelow"),
            LayersMenu.createAction("menu.layers.goToBottomLayer"),
            new VerticalSeparator(),
            LayersMenu.create("move.layer.to.top"),
            LayersMenu.create("move.layer.up"),
            LayersMenu.create("move.layer.down"),
            LayersMenu.create("move.layer.to.bottom"),
            new VerticalSeparator(),
            LayersMenu.create("layer.properties"),
        ]);

        this.updateEntriesOn(
            "document:layers_changed",
            "document:active_layer_changed",
            "app:update_active_document"
        );
    }

    static create(id) {
        return ActionRegistry.get("menu.layers." + id).createDropEntry();
    }

    static createAction(id) {
        return ActionRegistry.get(id).createDropEntry();
    }
}
