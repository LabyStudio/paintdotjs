class ToolHistoryMemento extends HistoryMemento {

    constructor(documentWorkspace, name, image) {
        super(name, image);

        this.app = documentWorkspace.getApp();
        this.toolId = this.app.getActiveTool().getId();
    }

    getDocumentWorkspace() {
        return this.documentWorkspace;
    }

    getToolId() {
        return this.toolId;
    }

    onToolUndo() {
        throw new Error("Not implemented");
    }

    onUndo() {
        if (this.app.getActiveTool().getId() !== this.toolId) {
            this.app.setActiveToolFromId(this.toolId);
        }

        return this.onToolUndo();
    }
}