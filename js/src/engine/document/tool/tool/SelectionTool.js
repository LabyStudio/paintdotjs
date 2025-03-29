class SelectionTool extends Tool {

    static CLEAR = 0;
    static EMIT = 1;
    static RESET = 2;

    constructor(type) {
        super(type);

        this.tracking = false;
        this.hasMoved = false;
        this.wasNotEmpty = false;
        this.moveOriginMode = false;
        this.append = false;
        this.startTime = 0;

        this.undoAction = null;
        this.combineMode = null;

        this.tracePoints = [];
        this.lastXY = null;

        this.newSelection = null;
        this.newSelectionRenderer = null;
    }

    onActivate() {
        super.onActivate();

        this.updateCursor();

        this.getDocumentWorkspace().getSelectionRenderer().setSelectionTinting(true);

        let surfaceBox = this.getSurfaceBox();

        this.newSelection = new Selection();
        this.newSelectionRenderer = new SelectionRenderer(surfaceBox, this.newSelection);
        this.newSelectionRenderer.setSelectionTinting(false);
        this.newSelectionRenderer.setOutlineAnimation(true);
        this.newSelectionRenderer.setVisible(false);
        surfaceBox.addRenderer(this.newSelectionRenderer);
    }

    onDeactivate() {
        super.onDeactivate();

        this.getDocumentWorkspace().getSelectionRenderer().setSelectionTinting(false);

        this.getSurfaceBox().removeRenderer(this.newSelectionRenderer);
        this.newSelection = null;
        this.newSelectionRenderer = null;
    }

    onMouseDown(mouseX, mouseY, button, position) {
        let x = position.getX();
        let y = position.getY();

        if (this.tracking) {
            this.moveOriginMode = true;
            this.lastXY = new Point(x, y);
        } else if (button === 0) {
            this.tracking = true;
            this.hasMoved = false;
            this.startTime = Date.now();

            this.tracePoints = [];
            this.tracePoints.push(new Point(x, y));

            this.undoAction = new SelectionHistoryMemento("sentinel", this.type.getIconSrc(), this.getDocumentWorkspace());

            let selection = this.getSelection();
            this.wasNotEmpty = !selection.isEmpty();

            if (this.app.isControlKeyDown() && button === 0) { // Left mouse button
                this.combineMode = CombineMode.UNION;
            } else if (this.app.isAltKeyDown() && button === 0) { // Left mouse button
                this.combineMode = CombineMode.EXCLUDE;
            } else if (this.app.isControlKeyDown() && button === 2) { // Right mouse button
                this.combineMode = CombineMode.XOR;
            } else if (this.app.isAltKeyDown() && button === 2) { // Right mouse button
                this.combineMode = CombineMode.INTERSECT;
            } else {
                this.combineMode = CombineMode.REPLACE;
            }

            this.getDocumentWorkspace().getSelectionRenderer().setSelectionOutline(false);

            this.newSelection.reset();
            let basePath = selection.createPath();
            this.newSelection.setContinuationPath(basePath, CombineMode.REPLACE);
            this.newSelection.commitContinuation();

            switch (this.combineMode) {
                case CombineMode.XOR:
                    this.append = true;
                    selection.resetContinuation();
                    break;
                case CombineMode.UNION:
                    this.append = true;
                    selection.resetContinuation();
                    break;
                case CombineMode.EXCLUDE:
                    this.append = true;
                    selection.resetContinuation();
                    break;
                case CombineMode.REPLACE:
                    this.append = false;
                    selection.reset();
                    break;
                case CombineMode.INTERSECT:
                    this.append = true;
                    selection.resetContinuation();
                    break;
            }

            this.newSelectionRenderer.setVisible(true);
        }

        return super.onMouseDown(mouseX, mouseY, button, position);
    }

    onMouseMove(mouseX, mouseY, position) {
        let x = position.getX();
        let y = position.getY();

        if (this.moveOriginMode) {
            let delta = new Size(x - this.lastXY.x, y - this.lastXY.y);

            for (let i = 0; i < this.tracePoints.length; i++) {
                let point = this.tracePoints[i];
                point.x += delta.width;
                point.y += delta.height;

                this.tracePoints[i] = point;
            }

            this.lastXY = new Point(x, y);
            this.render();
        } else if (this.tracking) {
            let mouseXY = new Point(x, y);

            if (!mouseXY.equals(this.tracePoints[this.tracePoints.length - 1])) {
                this.tracePoints.push(mouseXY);
            }

            this.hasMoved = true;
            this.render();
        }

        return super.onMouseMove(mouseX, mouseY, position);
    }

    onMouseUp(mouseX, mouseY, button, position) {
        if (this.moveOriginMode) {
            this.moveOriginMode = false;
        } else {
            this.done();
        }

        this.updateCursor();

        return super.onMouseUp(mouseX, mouseY, button, position);
    }

    done() {
        if (this.tracking) {
            let polygon = this.createSelectionPolygon();

            this.hasMoved = this.hasMoved && (polygon.length > 0);

            let tooQuick = Date.now() - this.startTime < 50;
            let clipped = (polygon.length === 0);

            let noEffect = false;

            let whatToDo;

            if (this.append) {
                if (!this.hasMoved || clipped || noEffect) {
                    whatToDo = SelectionTool.RESET;
                } else {
                    whatToDo = SelectionTool.EMIT;
                }
            } else {
                if (this.hasMoved && !tooQuick && !clipped && !noEffect) {
                    whatToDo = SelectionTool.EMIT;
                } else {
                    whatToDo = SelectionTool.CLEAR;
                }
            }

            let selection = this.getSelection();
            switch (whatToDo) {
                case SelectionTool.CLEAR:
                    if (this.wasNotEmpty) {
                        this.undoAction.setName(DeselectFunction.NAME);
                        this.undoAction.setImage(DeselectFunction.IMAGE);
                        this.getDocumentWorkspace().getHistory().pushNewMemento(this.undoAction);
                    }

                    selection.reset();
                    break;

                case SelectionTool.EMIT:
                    this.undoAction.setName(this.getType().getName());
                    this.getDocumentWorkspace().getHistory().pushNewMemento(this.undoAction);
                    selection.commitContinuation();
                    break;

                case SelectionTool.RESET:
                    selection.resetContinuation();
                    break;
            }

            this.newSelection.reset();
            this.newSelectionRenderer.setVisible(false);

            this.tracking = false;

            this.getDocumentWorkspace().getSelectionRenderer().setSelectionOutline(true);
        }
    }

    render() {
        if (this.tracePoints !== null && this.tracePoints.length > 1) {
            let polygon = this.createSelectionPolygon();

            if (polygon.length > 2) {
                let selection = this.getSelection();
                selection.setContinuationPoints(polygon, this.combineMode);

                let cm = this.combineMode === CombineMode.REPLACE ? CombineMode.REPLACE : CombineMode.XOR;
                this.newSelection.setContinuationPoints(polygon, cm);
            }
        }
    }

    updateCursor() {
        this.app.setCursorImg(this.getCursorImgUp());
    }

    createSelectionPolygon() {
        let trimmedTrace = this.trimShapePath(this.tracePoints);
        let shapePoints = this.createShape(trimmedTrace);
        let polygon;

        switch (this.combineMode) {
            case CombineMode.XOR:
            case CombineMode.EXCLUDE:
                polygon = shapePoints;
                break;
            case CombineMode.COMPLEMENT:
            case CombineMode.INTERSECT:
            case CombineMode.REPLACE:
            case CombineMode.UNION:
                polygon = Utility.sutherlandHodgman(this.getDocumentWorkspace().getDocument().getBounds(), shapePoints);
                break;
        }

        return polygon;
    }

    trimShapePath(trimTheseTracePoints) {
        return trimTheseTracePoints;
    }

    createShape(shapePoints) {
        return shapePoints;
    }

    getCursorImgDown() {
        throw new Error("Not implemented");
    }

    getCursorImgUp() {
        throw new Error("Not implemented");
    }

    getCursorImgUpPlus() {
        throw new Error("Not implemented");
    }

    getCursorImgUpMinus() {
        throw new Error("Not implemented");
    }
}