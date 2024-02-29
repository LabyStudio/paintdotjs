class ImageMenu extends DropMenuItem {
    constructor() {
        super("menu.image", [
            new DropEntry("menu.image.crop", null),
            new DropEntry("menu.image.resize", null),
            new DropEntry("menu.image.canvasSize", null),
            new VerticalSeparator(),
            new DropEntry("menu.image.flipHorizontal", null),
            new DropEntry("menu.image.flipVertical", null),
            new VerticalSeparator(),
            new DropEntry("menu.image.rotate90CW", null),
            new DropEntry("menu.image.rotate90CCW", null),
            new DropEntry("menu.image.rotate180", null),
            new VerticalSeparator(),
            new DropEntry("menu.image.applyEmbeddedColorProfile", null),
            new VerticalSeparator(),
            new DropEntry("menu.image.flatten", null),
        ]);
    }
}