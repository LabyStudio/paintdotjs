class ToolHistoryMemento extends HistoryMemento {

    constructor(documentWorkspace, name, image) {
        super(name, image);

        this.app = documentWorkspace.getApp();
        this.toolType = this.app.getActiveTool().getType();
    }

    getDocumentWorkspace() {
        return this.documentWorkspace;
    }

    getToolType() {
        return this.toolType;
    }

    onToolUndo() {
        throw new Error("Not implemented");
    }

    onUndo() {
        if (this.app.getActiveTool().getType() !== this.toolType) {
            this.app.setActiveToolFromType(this.toolType);
        }

        return this.onToolUndo();
    }
}