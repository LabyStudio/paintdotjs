class MoveSelectionTool extends MoveToolBase {

    constructor(type) {
        super(type);

        this.context = new MoveToolBaseContext();
    }

    onActivate() {
        this.getDocumentWorkspace().getSelectionRenderer().setSelectionTinting(true);

        this.context.offset = new Point(0, 0);
        this.context.liftedBounds = this.getSelection().getBounds();

        this.tracking = false;
        this.positionNubs(this.context.currentMode);

        super.onActivate();
    }

    onDeactivate() {
        this.getDocumentWorkspace().getSelectionRenderer().setSelectionTinting(false);

        if (this.context.lifted) {
            this.drop();
        }

        this.tracking = false;
        this.destroyNubs();

        super.onDeactivate();
    }

    onExecutingHistoryMemento() {
        this.dontDrop = true;
    }

    onExecutedHistoryMemento() {
        if (this.context.lifted) {
            this.render(this.context.offset, true);
        } else {
            this.destroyNubs();
            this.positionNubs(this.context.currentMode);
        }

        this.dontDrop = false;
    }

    drop() {
        let cha = new MoveSelectionContextHistoryMemento(this.getDocumentWorkspace(), this.context, this.getName(), this.getImage());
        this.currentHistoryMementos.push(cha);

        let sha = new SelectionHistoryMemento(this.getName(), this.getImage(), this.getDocumentWorkspace());
        this.currentHistoryMementos.push(sha);

        this.context.dispose();
        this.context = new MoveToolBaseContext();

        this.flushHistoryMementos(i18n("moveSelectionTool.historyMemento.dropSelection"));
    }

    onSelectionChanging() {
        super.onSelectionChanging();

        if (!this.dontDrop) {
            if (this.context.lifted) {
                this.drop();
            }

            if (this.tracking) {
                this.tracking = false;
            }
        }
    }

    onSelectionChanged() {
        if (!this.context.lifted) {
            this.destroyNubs();
            this.positionNubs(this.context.currentMode);
        }

        super.onSelectionChanged();
    }

    onLift(mouseX, mouseY, button) {
        // Do nothing
    }

    pushContextHistoryMemento() {
        let cha = new MoveSelectionContextHistoryMemento(
            this.getDocumentWorkspace(),
            this.context,
            null,
            null
        );
        this.currentHistoryMementos.push(cha);
    }

    render(renderOffset, useNewOffset) {
        this.positionNubs(this.context.currentMode);
    }

    preRender() {
        // Do nothing
    }

    onMouseUp(mouseX, mouseY, button) {
        let consumed = super.onMouseUp(mouseX, mouseY, button);

        if (!this.tracking) {
            return;
        }

        this.onMouseMove(mouseX, mouseY, button);

        this.rotateNub.setVisible(false);
        this.tracking = false;
        this.positionNubs(this.context.currentMode);

        let resourceName;
        switch (this.context.currentMode) {
            default:
                throw new Error("Invalid enum argument");

            case MoveToolBaseMode.ROTATE:
                resourceName = "moveSelectionTool.historyMemento.rotate";
                break;

            case MoveToolBaseMode.SCALE:
                resourceName = "moveSelectionTool.historyMemento.scale";
                break;

            case MoveToolBaseMode.TRANSLATE:
                resourceName = "moveSelectionTool.historyMemento.translate";
                break;
        }

        this.context.startAngle += this.angleDelta;

        let actionName = i18n(resourceName);
        this.flushHistoryMementos(actionName);

        return consumed;
    }

    flushHistoryMementos(name) {
        if (this.currentHistoryMementos.length > 0) {
            let cha = new CompoundHistoryMemento(null, null, this.currentHistoryMementos);

            let haName;

            if (name === null) {
                haName = this.getName();
            } else {
                haName = name;
            }

            let image = this.getImage();

            let ctha = new CompoundToolHistoryMemento(cha, this.getDocumentWorkspace(), haName, image);

            // ctha.setSeriesGuid(this.context.seriesGuid); // TODO implement seriesGuid
            this.getDocumentWorkspace().getHistory().pushNewMemento(ctha);

            this.currentHistoryMementos = [];
        }
    }

    dispose() {
        super.dispose();

        this.destroyNubs();

        if (this.context !== null) {
            this.context.dispose();
            this.context = null;
        }
    }

}