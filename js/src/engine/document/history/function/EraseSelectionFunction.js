class EraseSelectionFunction extends HistoryFunction {

    static NAME = i18n("menu.edit.eraseSelection.text");
    static IMAGE = "assets/icons/menu_edit_erase_selection_icon.png";

    onExecute(documentWorkspace) {
        const selection = documentWorkspace.getSelection();
        if (selection.isEmpty()) return null;

        const layer = documentWorkspace.getActiveLayer();
        if (!(layer instanceof BitmapLayer)) return null;

        const path = selection.createPath();
        const surface = layer.getSurface();
        const bounds = FillSelectionFunction.getPixelBounds(path, surface.getBounds());
        if (bounds.isEmpty()) {
            path.dispose();
            return null;
        }

        const changedRegion = Region.fromRectangle(bounds.clone());
        const bitmapMemento = new BitmapHistoryMemento(
            EraseSelectionFunction.NAME,
            EraseSelectionFunction.IMAGE,
            documentWorkspace,
            documentWorkspace.getActiveLayerIndex(),
            changedRegion
        );
        changedRegion.dispose();
        const selectionMemento = new SelectionHistoryMemento(
            EraseSelectionFunction.NAME,
            EraseSelectionFunction.IMAGE,
            documentWorkspace
        );

        const context = surface.context;
        context.save();
        FillSelectionFunction.tracePath(context, path);
        context.clip("evenodd");
        context.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
        context.restore();
        path.dispose();
        layer.invalidate(bounds);

        // Erase Selection in Paint.NET 5 also drops the selection. Keep both
        // changes in one undo step so undo restores the pixels and marquee.
        selection.push();
        selection.reset();
        selection.pop();

        return new CompoundHistoryMemento(
            EraseSelectionFunction.NAME,
            EraseSelectionFunction.IMAGE,
            [bitmapMemento, selectionMemento]
        );
    }
}
