class LayersWindowMenu extends DropMenuItem {
    constructor() {
        super("menu.layers", [
            new DropEntry("menu.layers.addNewLayer", null),
            new DropEntry("menu.layers.deleteLayer", null),
            new DropEntry("menu.layers.duplicateLayer", null),
            new DropEntry("menu.layers.mergeLayerDown", null),
            new DropEntry("menu.layers.toggleLayerVisibility", null),
            new DropSeparator(),
            new DropEntry("menu.layers.importFromFile", null),
            new DropSeparator(),
            new DropEntry("menu.layers.flipHorizontal", null),
            new DropEntry("menu.layers.flipVertical", null),
            new DropEntry("menu.layers.rotate180", null),
            new DropEntry("menu.layers.rotateZoom", null)
                .withTranslationKey("rotateZoomEffect.name"),
            new DropSeparator(),
            new DropEntry("menu.layers.goToTopLayer", null),
            new DropEntry("menu.layers.goToLayerAbove", null),
            new DropEntry("menu.layers.goToLayerBelow", null),
            new DropEntry("menu.layers.goToBottomLayer", null),
            new DropSeparator(),
            new DropEntry("menu.layers.moveLayerToTop", null),
            new DropEntry("menu.layers.moveLayerUp", null),
            new DropEntry("menu.layers.moveLayerDown", null),
            new DropEntry("menu.layers.moveLayerToBottom", null),
            new DropSeparator(),
            new DropEntry("menu.layers.layerProperties", null),
        ]);
    }
}