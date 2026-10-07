class ShapeDrawHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, name, image, state = null, restore = false) {
        super(documentWorkspace, name, image);
        this.state = state;
        this.restore = restore;
    }

    onToolUndo() {
        const tool = this.app.getActiveTool();
        if (!(tool instanceof PreviewShapeTool)) {
            throw new Error("Current tool is not a PreviewShapeTool");
        }

        if (this.restore) {
            tool.restorePendingState(this.state);
            return new ShapeDrawHistoryMemento(
                this.documentWorkspace, this.name, this.image, null, false
            );
        }

        const state = tool.capturePendingState();
        tool.cancelPending();
        return new ShapeDrawHistoryMemento(
            this.documentWorkspace, this.name, this.image, state, true
        );
    }
}
