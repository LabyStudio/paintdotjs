class MoveTool extends MoveToolBase {

    constructor(type) {
        super(type);

        this.context = new MoveToolContext();
        this.enableOutline = false;

        this.fullQuality = false;
        this.activeLayer = null;
        this.renderArgs = null;
        this.didPaste = false;
    }

    onActivate() {
        // TODO find the texture for the move tool cursor
        // this.app.setCursorImg("move_tool_cursor");

        this.context.lifted = false;
        this.context.liftedPixels = null;
        this.context.offset = new Point(0, 0);
        this.context.liftedBounds = this.getSelection().getBounds();
        this.activeLayer = this.getActiveLayer();

        if (this.renderArgs !== null) {
            this.renderArgs.dispose();
            this.renderArgs = null;
        }

        if (this.activeLayer === null) {
            this.renderArgs = null;
        } else {
            this.renderArgs = new RenderArgs(this.getActiveLayer())
        }

        this.tracking = false;
        this.positionNubs(this.context.currentMode);

        this.fullQuality = true;

        super.onActivate();
    }

    onDeactivate() {
        if (this.context.lifted) {
            this.drop();
        }

        this.activeLayer = null;

        if (this.renderArgs !== null) {
            this.renderArgs.dispose();
            this.renderArgs = null;
        }

        this.tracking = false;
        this.destroyNubs();

        super.onDeactivate();
    }

    drop() {
        this.restoreSavedRegion();

        let regionCopy = this.getSelection().createRegion();
        let simplifiedRegion = Utility.simplifyAndInflateRegion(regionCopy, Utility.defaultSimplificationFactor, 2);
        let bitmapAction2 = new BitmapHistoryMemento(
            this.getName(),
            this.getImage(),
            this.getDocumentWorkspace(),
            this.getActiveLayerIndex(),
            simplifiedRegion
        );

        let oldHQ = this.fullQuality;
        this.fullQuality = true;
        this.render(this.context.offset, true);
        this.fullQuality = oldHQ;
        this.currentHistoryMementos.push(bitmapAction2);

        this.activeLayer.invalidate(simplifiedRegion);
        // this.update();

        regionCopy.dispose();
        regionCopy = null;

        let sha = new SelectionHistoryMemento(this.getName(), this.getImage(), this.getDocumentWorkspace());
        this.currentHistoryMementos.push(sha);

        this.context.dispose();
        this.context = new MoveToolContext();

        this.flushHistoryMementos(i18n("moveTool.historyMemento.dropPixels"));
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

    onPasteMouseDown() {
        // TODO : Implement the logic for pasting
    }

    onLift(mouseX, mouseY, button) {
        let liftPath = this.getSelection().createPath();
        let liftRegion = this.getSelection().createRegion();

        this.context.liftedPixels = new MaskedSurface(this.activeLayer.getSurface(), liftPath);

        let bitmapAction = new BitmapHistoryMemento(
            this.getName(),
            this.getImage(),
            this.getDocumentWorkspace(),
            this.getActiveLayerIndex()
        );
        this.currentHistoryMementos.push(bitmapAction);

        // If the user is holding down the control key, we want to *copy* the pixels
        // and not "lift and erase"
        if (!this.app.isControlKeyDown()) {
            // let fill = this.app.getSecondaryColor();
            // fill.a = 0;
            // let op = new UnaryPixelOps.Constant(fill);
            // op.apply(this.renderArgs.getSurface(), liftRegion);
        }

        liftRegion.dispose();
        liftRegion = null;

        liftPath.dispose();
        liftPath = null;
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
        this.renderInternal(renderOffset, useNewOffset, true);
    }

    renderInternal(renderOffset, useNewOffset, saveRegion) {
        let savedBounds = this.getSelection().getBounds();
        let selectedRegion = this.getSelection().createRegion();
        let simplifiedRegion = Utility.simplifyAndInflateRegion(selectedRegion);

        if (saveRegion) {
            this.saveRegion(simplifiedRegion, savedBounds);
        }

        // TODO wait cursor changer

        this.context.liftedPixels.render(
            this.renderArgs.getSurface(),
            this.context.deltaTransform,
            ResamplingAlgorithm.NEAREST_NEIGHBOR
            // TODO fullQuality
        );

        this.activeLayer.invalidate(simplifiedRegion);
        this.positionNubs(this.context.currentMode);

        simplifiedRegion.dispose();
        selectedRegion.dispose();
    }

    preRender() {
        this.restoreSavedRegion();
    }

    onMouseUp(mouseX, mouseY, button) {
        let consumed = super.onMouseUp(mouseX, mouseY, button);

        if (!this.tracking) {
            return consumed;
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
                resourceName = "moveTool.historyMemento.rotate";
                break;

            case MoveToolBaseMode.SCALE:
                resourceName = "moveTool.historyMemento.scale";
                break;

            case MoveToolBaseMode.TRANSLATE:
                resourceName = "moveTool.historyMemento.translate";
                break;
        }

        this.context.startAngle += this.angleDelta;

        if (this.context.liftTransform == null) {
            this.context.liftTransform = new Matrix();
        }

        this.context.liftTransform.reset();
        this.context.liftTransform.multiply(this.context.deltaTransform, MatrixOrder.APPEND);

        let actionName = i18n(resourceName);
        this.flushHistoryMementos(actionName);

        return consumed;
    }

    flushHistoryMementos(name) {
        if (this.currentHistoryMementos.length > 0) {
            let cha = new CompoundHistoryMemento(null, null, this.currentHistoryMementos);

            let haName;
            let image;

            if (this.didPaste) {
                haName = i18n("commonAction.paste");
                image = "assets/icons/menu_edit_paste_icon.png";
                this.didPaste = false;
            } else {
                if (name === null) {
                    haName = this.getName();
                } else {
                    haName = name;
                }
                image = this.getImage();
            }

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

        if (this.renderArgs !== null) {
            this.renderArgs.dispose();
            this.renderArgs = null;
        }
    }

    onExecutingHistoryMemento() {
        this.dontDrop = true;

        this.restoreSavedRegion();
        // this.clearSavedMemory();
    }

    onExecutedHistoryMemento() {
        if (this.context.lifted) {
            let oldHQ = this.fullQuality;
            this.fullQuality = false;
            this.render(this.context.offset, true);
            // this.clearSavedMemory();
            this.fullQuality = oldHQ;
        } else {
            this.destroyNubs();
            this.positionNubs(this.context.currentMode);
        }

        this.dontDrop = false;
    }
}

class MoveToolContext extends MoveToolBaseContext {

    constructor() {
        super();

        this.liftedPixels = null;
        this.poLiftedPixels = null;
    }

}