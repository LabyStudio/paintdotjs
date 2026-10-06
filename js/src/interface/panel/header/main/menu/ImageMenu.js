class ImageMenu extends DropMenuItem {
    constructor() {
        super("menu.image", [
            ImageMenu.create("crop"),
            ImageMenu.create("resize"),
            ImageMenu.create("canvasSize"),
            new VerticalSeparator(),
            ImageMenu.create("flipHorizontal"),
            ImageMenu.create("flipVertical"),
            new VerticalSeparator(),
            ImageMenu.create("rotate90CW"),
            ImageMenu.create("rotate90CCW"),
            ImageMenu.create("rotate180"),
            new VerticalSeparator(),
            new DropEntry("menu.image.colorProfile", null),
            new VerticalSeparator(),
            ImageMenu.create("flatten"),
        ]);

        this.updateEntriesOn(
            "app:update_active_document",
            "document:selection_changed",
            "document:layers_changed"
        );
    }

    static create(id) {
        return ActionRegistry.get("menu.image." + id).createDropEntry();
    }
}
