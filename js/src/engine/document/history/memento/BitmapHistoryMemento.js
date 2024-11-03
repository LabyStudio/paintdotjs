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

        if (changedRegion !== null) {
            let region = changedRegion.clone();
            // this.tempFile = FileSystem.getPlatform().getTempFile();

            // TODO write the changed region to the temp file

            this.data = new BitmapHistoryMementoData(null, region);
        }
    }

    onUndo() {
        // TODO read the changed region from the temp file

        let redo = new BitmapHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace,
            this.layerIndex
        )
        redo.setId(this.getId());

        // TODO invalidate simplified region

        return redo;
    }

}