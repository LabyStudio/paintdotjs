class MoveToolBase extends Tool {

    constructor(type) {
        super(type);

        this.dontDrop = false;
        this.angleDelta = 0;
        this.moveNubs = null;
        this.rotateNub = null;
        this.tracking = false;
        this.context = null;
        this.hostShouldShowAngle = false;
        this.hostAngle = 0;
        this.currentHistoryMementos = [];
        this.deactivateOnLayerChange = true;
        this.enableOutline = true;
    }

    destroyNubs() {
        let surfaceBox = this.getSurfaceBox();

        if (this.moveNubs !== null) {
            for (let i = 0; i < this.moveNubs.length; i++) {
                surfaceBox.removeRenderer(this.moveNubs[i]);
                this.moveNubs[i].dispose();
                this.moveNubs[i] = null;
            }

            this.moveNubs = null;
        }

        if (this.rotateNub !== null) {
            surfaceBox.removeRenderer(this.rotateNub);
            this.rotateNub.dispose();
            this.rotateNub = null;
        }
    }

    getEdgeVector(edge) {
        let u;
        switch (edge) {
            case Edge.TOP_LEFT:
                u = new Point(-1, -1);
                break;

            case Edge.TOP:
                u = new Point(0, -1);
                break;

            case Edge.TOP_RIGHT:
                u = new Point(1, -1);
                break;

            case Edge.LEFT:
                u = new Point(-1, 0);
                break;

            case Edge.RIGHT:
                u = new Point(1, 0);
                break;

            case Edge.BOTTOM_LEFT:
                u = new Point(-1, 1);
                break;

            case Edge.BOTTOM_RIGHT:
                u = new Point(1, 1);
                break;

            case Edge.BOTTOM:
                u = new Point(0, 1);
                break;

            default:
                throw new Error("Invalid enum value");
        }

        return u;
    }

    determineMoveMode(mouseX, mouseY, button) {
        let mode = Mode.TRANSLATE;
        let edge = Edge.NONE;

        if (button === MouseButton.RIGHT) {
            mode = Mode.ROTATE;
        } else {
            let minDistance = Number.MAX_VALUE;
            let mousePt = new Point(mouseX, mouseY);

            for (let i = 0; i < this.moveNubs.length; ++i) {
                let nub = this.moveNubs[i];

                if (nub.isPointTouching(mousePt, true)) {
                    let distance = Utility.distance(mousePt, nub.getLocation());

                    if (distance < minDistance) {
                        minDistance = distance;
                        mode = Mode.SCALE;
                        edge = i;
                    }
                }
            }
        }

        return {
            mode: mode,
            edge: edge
        };
    }

    onPulse() {
        if (this.moveNubs !== null) {
            for (let i = 0; i < this.moveNubs.length; ++i) {
                // Oscillate between 25% and 100% alpha over a period of 2 seconds
                // Alpha value of 100% is sustained for a large duration of this period
                const period = 10000 * 2000; // 10000 ticks per ms, 2000ms per period
                let tick = (Date.now() % period) + (i * (period / this.moveNubs.length));
                let sin = Math.sin((tick / period) * (2.0 * Math.PI));

                // sin is [-1, +1]
                sin = Math.min(0.5, sin);

                // sin is [-1, +0.5]
                sin += 1.0;

                // sin is [0, 1.5]
                sin /= 2.0;

                // sin is [0, 0.75]
                sin += 0.25;

                // sin is [0.25, 1]
                let newAlpha = (sin * 255.0);
                let clampedAlpha = Utility.clamp(newAlpha, 0, 255);
                this.moveNubs[i].setAlpha(clampedAlpha);
            }
        }

        super.onPulse();
    }

    positionNubs(currentMode) {
        if (this.moveNubs === null) {
            this.moveNubs = [];

            for (let i = 0; i < 8; ++i) {
                this.moveNubs[i] = new MoveNubRenderer(this.getSurfaceBox());
                this.getSurfaceBox().addRenderer(this.moveNubs[i]);
            }

            let bounds = this.getSelection().getBounds(false);

            this.moveNubs[Edge.TOP_LEFT].setLocation(new Point(bounds.getLeft(), bounds.getTop()));
            this.moveNubs[Edge.TOP_LEFT].setShape(MoveNubShape.CIRCLE);

            this.moveNubs[Edge.TOP].setLocation(new Point((bounds.getLeft() + bounds.getRight()) / 2.0, bounds.getTop()));

            this.moveNubs[Edge.TOP_RIGHT].setLocation(new Point(bounds.getRight(), bounds.getTop()));
            this.moveNubs[Edge.TOP_RIGHT].setShape(MoveNubShape.CIRCLE);

            this.moveNubs[Edge.LEFT].setLocation(new Point(bounds.getLeft(), (bounds.getTop() + bounds.getBottom()) / 2.0));
            this.moveNubs[Edge.RIGHT].setLocation(new Point(bounds.getRight(), (bounds.getTop() + bounds.getBottom()) / 2.0));

            this.moveNubs[Edge.BOTTOM_LEFT].setLocation(new Point(bounds.getLeft(), bounds.getBottom()));
            this.moveNubs[Edge.BOTTOM_LEFT].setShape(MoveNubShape.CIRCLE);

            this.moveNubs[Edge.BOTTOM].setLocation(new Point((bounds.getLeft() + bounds.getRight()) / 2.0, bounds.getBottom()));

            this.moveNubs[Edge.BOTTOM_RIGHT].setLocation(new Point(bounds.getRight(), bounds.getBottom()));
            this.moveNubs[Edge.BOTTOM_RIGHT].setShape(MoveNubShape.CIRCLE);
        }

        if (this.rotateNub === null) {
            this.rotateNub = new RotateNubRenderer(this.getSurfaceBox());
            this.rotateNub.setVisible(false);
            this.getSurfaceBox().addRenderer(this.rotateNub, false);
        }

        if (this.getSelection().isEmpty()) {
            for (let nub of this.moveNubs) {
                nub.setVisible(false);
            }

            this.rotateNub.setVisible(false);
        } else {
            for (let nub of this.moveNubs) {
                nub.setVisible(!this.tracking || currentMode === Mode.SCALE);
                nub.setTransform(this.getSelection().getInterimTransform());
            }
        }
    }

    hideNubs() {
        if (this.moveNubs !== null) {
            for (let sbr of this.moveNubs) {
                sbr.setVisible(false);
            }
        }

        if (this.rotateNub !== null) {
            this.rotateNub.setVisible(false);
        }
    }

    flipEdgeVertically(edge) {
        let flippedEdge;

        switch (edge) {
            default:
                throw new Error("Invalid enum value");

            case Edge.BOTTOM:
                flippedEdge = Edge.TOP;
                break;

            case Edge.BOTTOM_LEFT:
                flippedEdge = Edge.TOP_LEFT;
                break;

            case Edge.BOTTOM_RIGHT:
                flippedEdge = Edge.TOP_RIGHT;
                break;

            case Edge.LEFT:
                flippedEdge = Edge.LEFT;
                break;

            case Edge.NONE:
                flippedEdge = Edge.NONE;
                break;

            case Edge.RIGHT:
                flippedEdge = Edge.RIGHT;
                break;

            case Edge.TOP:
                flippedEdge = Edge.BOTTOM;
                break;

            case Edge.TOP_LEFT:
                flippedEdge = Edge.BOTTOM_LEFT;
                break;

            case Edge.TOP_RIGHT:
                flippedEdge = Edge.BOTTOM_RIGHT;
                break;
        }

        return flippedEdge;
    }

    constrainScaling(
        liftedBounds,
        startWidth,
        startHeight,
        newWidth,
        newHeight
    ) {
        let hRatio = newWidth / liftedBounds.getWidth();
        let vRatio = newHeight / liftedBounds.getHeight();

        let bestScale = Math.min(hRatio, vRatio);
        let bestWidth = liftedBounds.getWidth() * bestScale;
        let bestHeight = liftedBounds.getHeight() * bestScale;

        let newXScale = bestWidth / startWidth;
        let newYScale = bestHeight / startHeight;

        return new Size(newXScale, newYScale);
    }

    constrainAngle(angle) {
        while (angle < 0) {
            angle += 360.0;
        }

        let iangle = Math.floor(angle);
        let lowerBound = Math.floor(iangle / 15) * 15;
        let upperBound = lowerBound + 15;
        let lowerDiff = Math.abs(angle - lowerBound);
        let upperDiff = Math.abs(angle - upperBound);

        let newAngle;

        if (lowerDiff < upperDiff) {
            newAngle = lowerBound;
        } else {
            newAngle = upperBound;
        }

        if (newAngle > 180.0) {
            newAngle -= 360.0;
        }

        return newAngle;
    }

    onKeyPress(key) {
        if (!this.tracking) {
            let dx = 0;
            let dy = 0;

            if (key === KeyButton.LEFT) {
                dx = -1;
            } else if (key === KeyButton.RIGHT) {
                dx = +1;
            } else if (key === KeyButton.UP) {
                dy = -1;
            } else if (key === KeyButton.DOWN) {
                dy = +1;
            }

            if (this.app.isControlKeyDown()) {
                dx *= 10;
                dy *= 10;
            }

            if (dx !== 0 || dy !== 0) {
                // TODO solve it without a workaround?
                // let docPos = new Point(-70000, -70000);
                // let newDocPos = new Point(docPos.getX() + dx, docPos.getY() + dy);
                // this.onMouseDown(new MouseEventArgs(MouseButtons.LEFT, 0, docPos.getX(), docPos.getY(), 0));
                // this.onMouseMove(new MouseEventArgs(MouseButtons.LEFT, 0, newDocPos.getX(), newDocPos.getY(), 0));
                // this.onMouseUp(new MouseEventArgs(MouseButtons.LEFT, 0, newDocPos.getX(), newDocPos.getY(), 0));
            }
        } else {
            super.onKeyPress(key);
        }
    }

    onActivate() {
        super.onActivate();
    }

    onDeactivate() {
        super.onDeactivate();
    }

    onLift(mouseX, mouseY, button) {
        throw new Error("Not implemented");
    }

    onDrop() {
        throw new Error("Not implemented");
    }

    preRender() {
        throw new Error("Not implemented");
    }

    render(newOffset, useNewOffset) {
        throw new Error("Not implemented");
    }

    pushContextHistoryMemento() {
        throw new Error("Not implemented");
    }

    lift(mouseX, mouseY, button) {
        this.pushContextHistoryMemento();

        this.context.seriesGuid = UUID.randomUUID();

        let out = this.determineMoveMode(mouseX, mouseY, button);
        this.context.currentMode = out.mode;
        this.context.startEdge = out.edge;

        // lift!
        this.context.startBounds = this.context.liftedBounds;
        this.context.liftedBounds = this.getSelection().getBounds(false);
        this.context.startMouseXY = new Point(mouseX, mouseY);
        this.context.offset = new Point(0, 0);
        this.context.startAngle = 0.0;
        this.context.lifted = true;
        this.context.liftTransform = this.getSelection().getCumulativeTransformCopy();

        this.onLift(mouseX, mouseY, button);

        this.positionNubs(this.context.currentMode);
    }

    onMouseDown(mouseX, mouseY, button) {
        let consumed = super.onMouseDown(mouseX, mouseY, button);

        if (this.tracking || button === MouseButton.MIDDLE) {
            return;
        }

        let determinedMoveMode = false;
        let newMode = Mode.TRANSLATE;
        let newEdge = Edge.NONE;

        if (this.getSelection().isEmpty()) {
            let shm = new SelectionHistoryMemento(
                i18n("selectAllAction.name"),
                "assets/icons/menu_edit_select_all_icon.png",
                this.getDocumentWorkspace()
            );

            this.getDocumentWorkspace().getHistory().pushNewMemento(shm);

            let selection = this.getDocumentWorkspace().getSelection();
            selection.performChanging();
            selection.reset();
            selection.setContinuation(this.getDocumentWorkspace().getDocument().getBounds(), CombineMode.REPLACE);
            selection.commitContinuation();
            selection.performChanged();

            if (button === MouseButton.RIGHT) {
                newMode = Mode.ROTATE;
            } else {
                newMode = Mode.TRANSLATE;
            }

            newEdge = Edge.NONE;

            determinedMoveMode = true;
        }

        this.getDocumentWorkspace().getSelectionRenderer().setSelectionOutline(this.enableOutline);

        if (!this.context.lifted) {
            this.lift(mouseX, mouseY, button);
        }

        this.pushContextHistoryMemento();

        if (!determinedMoveMode) {
            let out = this.determineMoveMode(mouseX, mouseY, button);
            newMode = out.mode;
            newEdge = out.edge;
            determinedMoveMode = true;
        }

        if (this.context.deltaTransform !== null) {
            this.context.deltaTransform.dispose();
            this.context.deltaTransform = null;
        }

        this.context.deltaTransform = new Matrix();
        this.context.deltaTransform.reset();

        if (newMode === Mode.TRANSLATE
            || newMode === Mode.SCALE
            || newMode !== this.context.currentMode
            || newMode === Mode.ROTATE) {
            this.context.startBounds = this.getSelection().getBounds(false);
            this.context.startMouseXY = new Point(mouseX, mouseY);
            this.context.offset = new Point(0, 0);

            if (this.context.baseTransform !== null) {
                this.context.baseTransform.dispose();
                this.context.baseTransform = null;
            }

            this.context.baseTransform = this.getSelection().getInterimTransformCopy();
        }

        this.context.startEdge = newEdge;
        this.context.currentMode = newMode;
        this.positionNubs(this.context.currentMode);

        this.tracking = true;
        this.rotateNub.setVisible(this.context.currentMode === Mode.ROTATE);

        if (this.context.startPath !== null) {
            this.context.startPath.dispose();
            this.context.startPath = null;
        }

        this.context.startPath = this.getSelection().createPath();
        this.context.startAngle = Utility.getAngleOfTransform(this.getSelection().getInterimTransform());

        let sha1 = new SelectionHistoryMemento(this.getName(), this.getImage(), this.getDocumentWorkspace());
        this.currentHistoryMementos.push(sha1);

        this.onMouseMove(mouseX, mouseY);

        if (this.enableOutline) {
            this.getDocumentWorkspace().getSelectionRenderer().resetOutlineWhiteOpacity();
        }

        return consumed;
    }

    onMouseMove(mouseX, mouseY) {
        let consumed = super.onMouseMove(mouseX, mouseY);

        if (this.tracking) {
            let newMouseXY = new Point(mouseX, mouseY);
            let newOffset = new Point(
                newMouseXY.getX() - this.context.startMouseXY.getX(),
                newMouseXY.getY() - this.context.startMouseXY.getY()
            );

            this.preRender();

            this.dontDrop = true;

            this.getSelection().performChanging();

            let translateMatrix = new Matrix();
            translateMatrix.reset();

            if (this.context.baseTransform !== null) {
                this.getSelection().setInterimTransform(this.context.baseTransform);
            }

            let interim = this.getSelection().getInterimTransformCopy();

            switch (this.context.currentMode) {
                case Mode.TRANSLATE:
                    translateMatrix.translate(newOffset.getX(), newOffset.getY(), MatrixOrder.APPEND);
                    break;
                case Mode.ROTATE:
                    let rect = this.context.liftedBounds;
                    let center = new Point(
                        rect.getLeft() + (rect.getWidth() / 2.0),
                        rect.getTop() + (rect.getHeight() / 2.0)
                    );
                    center = Utility.transformOnePoint(interim, center);
                    let theta1 = Math.atan2(
                        this.context.startMouseXY.getY() - center.getY(),
                        this.context.startMouseXY.getX() - center.getX()
                    );
                    let theta2 = Math.atan2(mouseY - center.getY(), mouseX - center.getX());
                    let thetaDelta = theta2 - theta1;
                    this.angleDelta = (thetaDelta * (180.0 / Math.PI));
                    let angle = this.context.startAngle + this.angleDelta;

                    if (this.app.isShiftKeyDown()) {
                        angle = this.constrainAngle(angle);
                        this.angleDelta = angle - this.context.startAngle;
                    }

                    translateMatrix.rotateAt(this.angleDelta, center, MatrixOrder.APPEND);
                    this.rotateNub.setLocation(center);
                    this.rotateNub.setAngle(this.context.startAngle + this.angleDelta);

                    // TODO Set rotate cursor and rotate the image
                    let direction = "";
                    switch (Math.abs(Math.floor(-this.angleDelta / 45 - 45 / 2) + 1) % 4) {
                        case 0:
                            direction = "ew";
                            break;
                        case 1:
                            direction = "nwse";
                            break;
                        case 2:
                            direction = "ns";
                            break;
                        case 3:
                            direction = "nesw";
                            break;
                    }
                    this.app.setCursor(direction + "-resize");

                    break;
                case Mode.SCALE:
                    let xyAxes = this.getEdgeVector(this.context.startEdge);
                    let xAxis = new Point(xyAxes.getX(), 0);
                    let yAxis = new Point(0, xyAxes.getY());
                    let edgeX = Utility.transformOneVector(interim, xAxis);
                    let edgeY = Utility.transformOneVector(interim, yAxis);
                    let edgeXN = Utility.normalizeVector2(edgeX);
                    let edgeYN = Utility.normalizeVector2(edgeY);

                    let xulen = Utility.getProjection(newOffset, edgeXN).yhatLen;
                    let yulen = Utility.getProjection(newOffset, edgeYN).yhatLen;

                    let startPath2 = this.context.startPath.clone();
                    let sp2Bounds = startPath2.getBounds();

                    let sp2BoundsCenter = new Point(
                        (sp2Bounds.getLeft() + sp2Bounds.getRight()) / 2.0,
                        (sp2Bounds.getTop() + sp2Bounds.getBottom()) / 2.0
                    );

                    let tAngle = Utility.getAngleOfTransform(interim);
                    let isFlipped = Utility.isTransformFlipped(interim);

                    let spm = new Matrix();
                    spm.reset();
                    spm.rotateAt(-tAngle, sp2BoundsCenter, MatrixOrder.APPEND);
                    translateMatrix.rotateAt(-tAngle, sp2BoundsCenter, MatrixOrder.APPEND);
                    startPath2.transform(spm);

                    let spBounds2 = startPath2.getBounds();

                    startPath2.dispose();
                    startPath2 = null;

                    let xTranslate;
                    let yTranslate;
                    let allowConstrain;

                    let theEdge = this.context.startEdge;

                    // If the transform is flipped, then GetTransformAngle will return 180 degrees
                    // even though no rotation has actually taken place. Thus we have to scratch
                    // our head and go "hmm, let's make some adjustments to this." Otherwise stretching
                    // the top and bottom nubs goes in the wrong direction.
                    if (isFlipped) {
                        theEdge = this.flipEdgeVertically(theEdge);
                    }

                    switch (theEdge) {
                        default:
                            throw new Error("Invalid enum value");

                        case Edge.TOP_LEFT:
                            allowConstrain = true;
                            xTranslate = -spBounds2.getLeft() - spBounds2.getWidth();
                            yTranslate = -spBounds2.getTop() - spBounds2.getHeight();
                            break;

                        case Edge.TOP:
                            allowConstrain = false;
                            xTranslate = 0;
                            yTranslate = -spBounds2.getTop() - spBounds2.getHeight();
                            break;

                        case Edge.TOP_RIGHT:
                            allowConstrain = true;
                            xTranslate = -spBounds2.getLeft();
                            yTranslate = -spBounds2.getTop() - spBounds2.getHeight();
                            break;

                        case Edge.LEFT:
                            allowConstrain = false;
                            xTranslate = -spBounds2.getLeft() - spBounds2.getWidth();
                            yTranslate = 0;
                            break;

                        case Edge.RIGHT:
                            allowConstrain = false;
                            xTranslate = -spBounds2.getLeft();
                            yTranslate = 0;
                            break;

                        case Edge.BOTTOM_LEFT:
                            allowConstrain = true;
                            xTranslate = -spBounds2.getLeft() - spBounds2.getWidth();
                            yTranslate = -spBounds2.getTop();
                            break;

                        case Edge.BOTTOM:
                            allowConstrain = false;
                            xTranslate = 0;
                            yTranslate = -spBounds2.getTop();
                            break;

                        case Edge.BOTTOM_RIGHT:
                            allowConstrain = true;
                            xTranslate = -spBounds2.getLeft();
                            yTranslate = -spBounds2.getTop();
                            break;
                    }

                    let newWidth = spBounds2.getWidth() + xulen;
                    let newHeight = spBounds2.getHeight() + yulen;
                    let xScale = newWidth / spBounds2.getWidth();
                    let yScale = newHeight / spBounds2.getHeight();

                    if (allowConstrain && this.app.isShiftKeyDown()) {
                        let out3 = this.constrainScaling(
                            this.context.liftedBounds,
                            spBounds2.getWidth(),
                            spBounds2.getHeight(),
                            newWidth,
                            newHeight
                        );

                        xScale = out3.width;
                        yScale = out3.height;
                    }

                    translateMatrix.translate(xTranslate, yTranslate, MatrixOrder.APPEND);
                    translateMatrix.scale(xScale, yScale, MatrixOrder.APPEND);
                    translateMatrix.translate(-xTranslate, -yTranslate, MatrixOrder.APPEND);
                    translateMatrix.rotateAt(+tAngle, sp2BoundsCenter, MatrixOrder.APPEND);

                    this.app.setCursorImg("hand_closed_cursor");

                    break;
                default:
                    throw new Error("Invalid enum value");
            }

            this.context.deltaTransform.reset();
            this.context.deltaTransform.multiply(this.context.liftTransform, MatrixOrder.APPEND);
            this.context.deltaTransform.multiply(translateMatrix, MatrixOrder.APPEND);

            translateMatrix.multiply(this.context.baseTransform, MatrixOrder.PREPEND);

            this.getSelection().setInterimTransform(translateMatrix);

            interim.dispose();
            interim = null;

            // advertise our angle of rotation to any host (i.e. mainform) that might want to use that information
            this.hostShouldShowAngle = this.rotateNub.isVisible();
            this.hostAngle = -this.rotateNub.getAngle();

            this.getSelection().performChanged();
            this.dontDrop = false;

            this.render(newOffset, true);
            // this.update() // TODO notify?

            this.context.offset = newOffset;

            if (this.enableOutline) {
                this.getDocumentWorkspace().getSelectionRenderer().resetOutlineWhiteOpacity();
            }

            return consumed;
        } else {

            for (let i = 0; i < this.moveNubs.length; ++i) {
                let nub = this.moveNubs[i];

                if (nub.isVisible() && nub.isPointTouching(new Point(mouseX, mouseY), true)) {
                    this.app.setCursorImg("hand_open_cursor");
                    return;
                }
            }

            this.app.setCursor("move");
        }
    }

    onMouseUp(mouseX, mouseY, button) {
        this.getDocumentWorkspace().getSelectionRenderer().setSelectionOutline(true);
        return super.onMouseUp(mouseX, mouseY, button);
    }
}

class Mode {
    static TRANSLATE = 0;
    static SCALE = 1;
    static ROTATE = 2;
}

class Edge {
    static TOP_LEFT = 0;
    static TOP = 1;
    static TOP_RIGHT = 2;
    static RIGHT = 3;
    static BOTTOM_RIGHT = 4;
    static BOTTOM = 5;
    static BOTTOM_LEFT = 6;
    static LEFT = 7;
    static NONE = 99;
}

class Context {

    constructor() {
        this.lifted = false;
        this.seriesGuid = null;
        this.baseTransform = null; // a copy of the selection's interim transform at the time of mouse-down
        this.liftTransform = null; // a copy of the selection's interim transform at the time of lifting
        this.deltaTransform = null; // the transformations made since lifting
        this.liftedBounds = null;
        this.startBounds = null;
        this.startAngle = 0;
        this.startPath = null;
        this.currentMode = null;
        this.startEdge = null;
        this.startMouseXY = null;
        this.offset = null;
    }

    getMatrixElements(matrix) {
        if (matrix === null) {
            return null;
        } else {
            return matrix.getElements();
        }
    }

    clone() {
        let clone = new Context();
        clone.lifted = this.lifted;
        clone.seriesGuid = this.seriesGuid;
        if (this.baseTransform !== null) {
            clone.baseTransform = this.baseTransform.clone();
        }
        if (this.liftTransform !== null) {
            clone.liftTransform = this.liftTransform.clone();
        }
        if (this.deltaTransform !== null) {
            clone.deltaTransform = this.deltaTransform.clone();
        }

        clone.liftedBounds = this.liftedBounds;
        clone.startBounds = this.startBounds;
        clone.startAngle = this.startAngle;

        if (this.startPath !== null) {
            clone.startPath = this.startPath.clone();
        }

        clone.currentMode = this.currentMode;
        clone.startEdge = this.startEdge;

        clone.startMouseXY = this.startMouseXY;
        clone.offset = this.offset;

        return clone;
    }

    dispose() {
        // TODO dispose
    }
}