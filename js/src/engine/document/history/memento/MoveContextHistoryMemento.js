class MoveContextHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, context, name, image) {
        super(documentWorkspace, name, image);

        this.data = new OurHistoryMementoData(context);
        this.layerIndex = 0;
        this.liftedPixelsRef = null;
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
            this.image
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

        moveTool.destroyNubs();

        if (moveTool.context.lifted) {
            moveTool.positionNubs(moveTool.context.currentMode);
        }

        return cha;
    }
}