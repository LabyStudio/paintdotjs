class ShapeEditHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, state, name, image) {
        super(documentWorkspace, name, image);
        this.state = state;
    }

    onToolUndo() {
        const tool = this.app.getActiveTool();
        if (!(tool instanceof PreviewShapeTool)) {
            throw new Error("Current tool is not a PreviewShapeTool");
        }

        const inverseState = tool.capturePendingState();
        tool.cancelBitmapTransaction();
        tool.restorePendingState(this.state);
        return new ShapeEditHistoryMemento(
            this.documentWorkspace, inverseState, this.name, this.image
        );
    }
}
