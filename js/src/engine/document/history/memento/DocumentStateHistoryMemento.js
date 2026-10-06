class DocumentStateHistoryMemento extends HistoryMemento {

    constructor(name, image, documentWorkspace) {
        super(name, image);

        this.documentWorkspace = documentWorkspace;
        this.document = documentWorkspace.getDocument();
        this.activeLayerIndex = documentWorkspace.getActiveLayerIndex();
        this.selectionData = documentWorkspace.getSelection().save();
        this.zoom = documentWorkspace.getZoom();
        this.zoomToWindow = documentWorkspace.isZoomToWindow();
        this.viewportX = documentWorkspace.getViewportX();
        this.viewportY = documentWorkspace.getViewportY();
    }

    onUndo() {
        const redo = new DocumentStateHistoryMemento(
            this.name,
            this.image,
            this.documentWorkspace
        );
        const app = this.documentWorkspace.getApp();
        const activeTool = app.getActiveTool();
        const activeToolType = activeTool === null ? null : activeTool.getType();

        app.setActiveTool(null);
        this.documentWorkspace.setDocument(this.document);
        this.documentWorkspace.setActiveLayerIndex(this.activeLayerIndex);
        this.documentWorkspace.getSelection().restore(this.selectionData);
        this.documentWorkspace.zoom = this.zoom;
        this.documentWorkspace.zoomToWindow = this.zoomToWindow;
        this.documentWorkspace.viewportX = this.viewportX;
        this.documentWorkspace.viewportY = this.viewportY;
        this.document.invalidate();

        app.updateCanvasBounds(false);
        app.fire("document:layers_changed", this.documentWorkspace);
        app.fire("document:update_size", this.document.getWidth(), this.document.getHeight());
        app.fire("document:update_viewport", this.documentWorkspace);

        if (activeToolType !== null) app.setActiveToolFromType(activeToolType);
        return redo;
    }
}
