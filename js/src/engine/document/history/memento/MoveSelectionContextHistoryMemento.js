class MoveSelectionContextHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, context, name, image) {
        super(documentWorkspace, name, image);

        this.data = new OurHistoryMementoData(context);
    }

    onToolUndo() {
        let moveSelectionTool = this.app.getActiveTool();
        if (!(moveSelectionTool instanceof MoveSelectionTool)) {
            throw new Error("Current Tool is not the MoveSelectionTool");
        }

        let cha = new MoveSelectionContextHistoryMemento(
            this.documentWorkspace,
            moveSelectionTool.context,
            this.name,
            this.image
        );
        let ohad = this.data;
        let newContext = ohad.context;

        moveSelectionTool.context.dispose();
        moveSelectionTool.context = newContext;

        moveSelectionTool.destroyNubs();

        if (moveSelectionTool.context.lifted) {
            moveSelectionTool.positionNubs(moveSelectionTool.context.currentMode);
        }

        return cha;
    }
}