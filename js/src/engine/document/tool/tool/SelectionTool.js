/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

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
        this.oldSelectionBounds = null;

        this.tracePoints = [];
        this.lastXY = null;

        this.newSelection = null;
        this.newSelectionRenderer = null;
    }

    onActivate() {
        super.onActivate();

        this.updateCursor();

        const selectionRenderer = this.getDocumentWorkspace().getSelectionRenderer();
        selectionRenderer.setSelectionTinting(true);
        if (typeof selectionRenderer.setRenderingQuality === "function") {
            selectionRenderer.setRenderingQuality(this.getSetting("renderingQuality", "high"));
        }

        let surfaceBox = this.getSurfaceBox();

        this.newSelection = new Selection();
        this.newSelectionRenderer = new SelectionRenderer(surfaceBox, this.newSelection);
        this.newSelectionRenderer.setSelectionTinting(false);
        this.newSelectionRenderer.setOutlineAnimation(true);
        if (typeof this.newSelectionRenderer.setRenderingQuality === "function") {
            this.newSelectionRenderer.setRenderingQuality(this.getSetting("renderingQuality", "high"));
        }
        this.newSelectionRenderer.setVisible(false);
        surfaceBox.addRenderer(this.newSelectionRenderer);
    }

    onDeactivate() {
        if (this.tracking) {
            this.done();
        }

        this.getDocumentWorkspace().getSelectionRenderer().setSelectionTinting(false);

        this.getSurfaceBox().removeRenderer(this.newSelectionRenderer);
        this.newSelection = null;
        this.newSelectionRenderer = null;
        this.oldSelectionBounds = null;
        super.onDeactivate();
    }

    onSettingChanged(key) {
        if (key === "renderingQuality") {
            const quality = this.getSetting("renderingQuality", "high");
            const selectionRenderer = this.getDocumentWorkspace().getSelectionRenderer();
            if (typeof selectionRenderer.setRenderingQuality === "function") {
                selectionRenderer.setRenderingQuality(quality);
            }
            if (this.newSelectionRenderer !== null
                && typeof this.newSelectionRenderer.setRenderingQuality === "function") {
                this.newSelectionRenderer.setRenderingQuality(quality);
            }
        }
    }

    onMouseDown(mouseX, mouseY, button) {
        if (this.tracking) {
            this.moveOriginMode = true;
            this.lastXY = new Point(mouseX, mouseY);
            this.updateCursor();
            return true;
        } else if (button === MouseButton.LEFT || button === MouseButton.RIGHT) {
            this.tracking = true;
            this.hasMoved = false;
            this.startTime = Date.now();

            this.tracePoints = [];
            this.tracePoints.push(new Point(mouseX, mouseY));

            this.undoAction = new SelectionHistoryMemento("sentinel", this.type.getIconSrc(), this.getDocumentWorkspace());

            let selection = this.getSelection();
            this.wasNotEmpty = !selection.isEmpty();
            this.oldSelectionBounds = selection.getBounds();

            if (this.app.isControlKeyDown() && button === MouseButton.LEFT) {
                this.combineMode = CombineMode.UNION;
            } else if (this.app.isAltKeyDown() && button === MouseButton.LEFT) {
                this.combineMode = CombineMode.EXCLUDE;
            } else if (this.app.isControlKeyDown() && button === MouseButton.RIGHT) {
                this.combineMode = CombineMode.XOR;
            } else if (this.app.isAltKeyDown() && button === MouseButton.RIGHT) {
                this.combineMode = CombineMode.INTERSECT;
            } else {
                this.combineMode = this.getConfiguredCombineMode();
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
            this.updateCursor();
            return true;
        }

        return super.onMouseDown(mouseX, mouseY, button);
    }

    getConfiguredCombineMode() {
        switch (this.getSetting("combineMode", "replace")) {
            case "union": return CombineMode.UNION;
            case "exclude": return CombineMode.EXCLUDE;
            case "intersect": return CombineMode.INTERSECT;
            case "xor": return CombineMode.XOR;
            default: return CombineMode.REPLACE;
        }
    }

    mustMoveForEmit() {
        return true;
    }

    onMouseMove(mouseX, mouseY, input = null) {
        if (this.moveOriginMode) {
            let delta = new Size(mouseX - this.lastXY.x, mouseY - this.lastXY.y);

            for (let i = 0; i < this.tracePoints.length; i++) {
                let point = this.tracePoints[i];
                point.x += delta.width;
                point.y += delta.height;

                this.tracePoints[i] = point;
            }

            this.lastXY = new Point(mouseX, mouseY);
            this.render();
        } else if (this.tracking) {
            const samples = input !== null && Array.isArray(input.samples)
                ? input.samples
                : [];
            for (const sample of samples) {
                this.appendTracePoint(sample.x, sample.y);
            }
            this.appendTracePoint(mouseX, mouseY);

            this.hasMoved = true;
            this.render();
        }

        this.updateCursor();
        return this.tracking || super.onMouseMove(mouseX, mouseY, input);
    }

    appendTracePoint(x, y) {
        const point = new Point(Math.floor(x), Math.floor(y));
        if (!point.equals(this.tracePoints[this.tracePoints.length - 1])) {
            this.tracePoints.push(point);
        }
    }

    onMouseUp(mouseX, mouseY, button, input = null) {
        const wasTracking = this.tracking;
        if (wasTracking) {
            this.onMouseMove(mouseX, mouseY, input);
        }
        if (this.moveOriginMode) {
            this.moveOriginMode = false;
        } else {
            this.done();
        }

        this.updateCursor();

        return wasTracking || super.onMouseUp(mouseX, mouseY, button, input);
    }

    done() {
        if (this.tracking) {
            let polygon = this.createSelectionPolygon();

            this.hasMoved = this.hasMoved && (polygon.length > 1);

            let tooQuick = Date.now() - this.startTime <= 50;
            const polygonBounds = this.getPolygonBounds(polygon);
            let clipped = polygon.length < 3 || polygonBounds.isEmpty();
            const intersectsOldSelection = this.oldSelectionBounds !== null
                && !Rectangle.intersect(this.oldSelectionBounds, polygonBounds).isEmpty();

            let whatToDo;

            if (this.append) {
                if (this.combineMode === CombineMode.INTERSECT && clipped) {
                    whatToDo = SelectionTool.CLEAR;
                } else if (!this.hasMoved || clipped) {
                    whatToDo = SelectionTool.RESET;
                } else if (this.combineMode === CombineMode.INTERSECT && !intersectsOldSelection) {
                    whatToDo = SelectionTool.CLEAR;
                } else if (this.combineMode === CombineMode.EXCLUDE && !intersectsOldSelection) {
                    whatToDo = SelectionTool.RESET;
                } else {
                    whatToDo = SelectionTool.EMIT;
                }
            } else {
                if ((this.hasMoved || !this.mustMoveForEmit())
                    && (!tooQuick || !this.mustMoveForEmit()) && !clipped) {
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
            this.moveOriginMode = false;
            this.undoAction = null;
            this.oldSelectionBounds = null;

            this.getDocumentWorkspace().getSelectionRenderer().setSelectionOutline(true);
        }
    }

    getPolygonBounds(polygon) {
        if (polygon.length === 0) {
            return Rectangle.empty();
        }
        let minX = polygon[0].x;
        let minY = polygon[0].y;
        let maxX = minX;
        let maxY = minY;
        for (let i = 1; i < polygon.length; ++i) {
            minX = Math.min(minX, polygon[i].x);
            minY = Math.min(minY, polygon[i].y);
            maxX = Math.max(maxX, polygon[i].x);
            maxY = Math.max(maxY, polygon[i].y);
        }
        return Rectangle.absolute(minX, minY, maxX, maxY);
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
        if (this.tracking) {
            this.app.setCursorImg(this.getCursorImgDown());
        } else if (this.app.isControlKeyDown()) {
            this.app.setCursorImg(this.getCursorImgUpPlus());
        } else if (this.app.isAltKeyDown()) {
            this.app.setCursorImg(this.getCursorImgUpMinus());
        } else {
            this.app.setCursorImg(this.getCursorImgUp());
        }
    }

    onModifierKeysChanged() {
        if (this.tracking) {
            this.render();
        }
        this.updateCursor();
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
