class MoveContextHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, context, name, image, captureScratchSurface = false) {
        super(documentWorkspace, name, image);

        this.data = new OurHistoryMementoData(context);
        this.layerIndex = documentWorkspace.getActiveLayerIndex();
        this.liftedPixelsRef = null;
        this.captureScratchSurface = captureScratchSurface;
        const moveTool = this.app.getActiveTool();
        this.scratchSurface = captureScratchSurface && context.lifted
            && moveTool instanceof MoveTool && moveTool.scratchSurface !== null
            ? moveTool.scratchSurface.clone()
            : null;
    }

    onToolUndo() {
        let moveTool = this.app.getActiveTool();
        if (!(moveTool instanceof MoveTool)) {
            throw new Error("Current Tool is not the MoveTool");
        }

        let cha = new MoveContextHistoryMemento(
            this.documentWorkspace,
            moveTool.context,
            this.name,
            this.image,
            this.captureScratchSurface
        )
        let ohad = this.data;
        let newContext = ohad.context;

        if (moveTool.getActiveLayerIndex() !== this.layerIndex) {
            let oldDOLC = moveTool.deactivateOnLayerChange;
            moveTool.deactivateOnLayerChange = false;
            moveTool.setActiveLayerIndex(this.layerIndex);
            moveTool.deactivateOnLayerChange = oldDOLC;
            moveTool.activeLayer = moveTool.getActiveLayer();
            moveTool.renderArgs = new RenderArgs(moveTool.getActiveLayer().surface);
            // moveTool.clearSavedMemory();
        }

        moveTool.context.dispose();
        moveTool.context = newContext;

        if (this.scratchSurface !== null) {
            moveTool.scratchSurface.copySurface(this.scratchSurface);
        }

        moveTool.destroyNubs();

        if (moveTool.context.lifted) {
            moveTool.positionNubs(moveTool.context.currentMode);
        }

        return cha;
    }
}
