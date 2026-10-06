class BitmapHistoryMemento extends HistoryMemento {

    constructor(
        name,
        image,
        documentWorkspace,
        layerIndex,
        changedRegion = null,
        copyFromThisSurface = documentWorkspace.getDocument().getLayers().getAt(layerIndex).getSurface()
    ) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.layerIndex = layerIndex;
        const source = copyFromThisSurface;
        const requestedRectangles = changedRegion === null
            ? [source.getBounds()]
            : changedRegion.getRectangles();
        this.chunks = [];
        for (const requested of requestedRectangles) {
            let bounds = Rectangle.absolute(
                Math.floor(requested.getLeft()), Math.floor(requested.getTop()),
                Math.ceil(requested.getRight()), Math.ceil(requested.getBottom())
            );
            bounds = Rectangle.intersect(bounds, source.getBounds());
            if (bounds.width <= 0 || bounds.height <= 0) continue;
            this.chunks.push({
                bounds,
                imageData: source.context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height)
            });
        }
        this.bounds = this.chunks.length === 0 ? Rectangle.empty() : this.chunks
            .map(chunk => chunk.bounds)
            .reduce((left, right) => Rectangle.union(left, right));
    }

    onUndo() {
        let layer = this.documentWorkspace.getDocument().getLayers().getAt(this.layerIndex);
        let surface = layer.getSurface();
        let changedRegion = Region.fromRectangles(this.chunks.map(chunk => chunk.bounds.clone()));
        let redo = new BitmapHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.layerIndex,
            changedRegion,
            surface
        );
        changedRegion.dispose();
        redo.setId(this.getId());

        for (const chunk of this.chunks) {
            surface.context.putImageData(chunk.imageData, chunk.bounds.x, chunk.bounds.y);
        }
        if (!this.bounds.isEmpty()) layer.invalidate(this.bounds);

        return redo;
    }

}
