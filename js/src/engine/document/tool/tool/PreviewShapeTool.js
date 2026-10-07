class PreviewShapeTool extends DrawingTool {
    constructor(type, shape) {
        super(type, 2, false);
        this.shape = shape;
        this.startPoint = null;
        this.endPoint = null;
        this.pointerStartPoint = null;
        this.pending = false;
        this.interactionMode = null;
        this.interactionEdge = MoveToolBaseEdge.NONE;
        this.interactionStart = null;
        this.originalStartPoint = null;
        this.originalEndPoint = null;
        this.originalTransform = null;
        this.shapeTransform = new Matrix();
        this.shapeTransform.reset();
        this.startAngle = 0;
        this.angleDelta = 0;
        this.moveNubs = null;
        this.rotateNub = null;
        this.rotateIndicator = null;
        this.curveNubs = null;
        this.curveControlPoints = null;
        this.curveControlIndex = -1;
        this.gradientNubs = null;
        this.gradientControlIndex = -1;
        this.colorsForm = null;
        this.colorsChangedListener = () => this.onColorsChanged();
        this.restoredSettings = null;
        this.restoredColors = null;
        this.drawHistoryPushed = false;
        this.editingStartState = null;
    }

    onActivate() {
        super.onActivate();
        this.colorsForm = FormRegistry.get("colorsForm");
        if (this.colorsForm !== null) this.colorsForm.changed.add(this.colorsChangedListener);
    }

    usesContinuousPointerCoordinates() {
        // Preserve sub-pixel pointer movement while an existing shape is being
        // edited. Individual transforms then snap at their half-pixel point.
        return this.pending || this.interactionMode !== null;
    }

    onMouseDown(x, y, button) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) return false;
        const point = new Point(x, y);

        if (this.supportsPendingEdit() && this.pending) {
            if (this.shape === "line" && this.beginCurveControlInteraction(point)) return true;
            if (this.shape === "gradient" && this.beginGradientControlInteraction(point)) return true;
            // Paint.NET's LineCurveShape uses ShapeTransformOption.None. Its
            // four path points are editable, but it does not show the generic
            // eight-handle bounding box or the rotation handle.
            const mode = !this.usesBoundingBoxNubs()
                ? {mode: MoveToolBaseMode.TRANSLATE, edge: MoveToolBaseEdge.NONE}
                : MoveToolBase.prototype.determineMoveMode.call(this, x, y, button);
            if (mode.mode === MoveToolBaseMode.SCALE || mode.mode === MoveToolBaseMode.ROTATE
                || this.hitTestPendingShape(point)) {
                this.tracking = true;
                this.interactionMode = mode.mode;
                this.interactionEdge = mode.edge;
                this.interactionStart = point;
                this.originalStartPoint = this.startPoint.clone();
                this.originalEndPoint = this.endPoint.clone();
                this.originalTransform = this.shapeTransform.clone();
                this.editingStartState = this.capturePendingState();
                this.startAngle = Utility.getAngleOfTransform(this.shapeTransform);
                this.angleDelta = 0;
                if (this.usesBoundingBoxNubs()) {
                    MoveToolBase.prototype.positionNubs.call(this, this.interactionMode);
                    this.rotateNub.setVisible(this.interactionMode === MoveToolBaseMode.ROTATE);
                    this.rotateIndicator.setVisible(false);
                }
                if (this.interactionMode === MoveToolBaseMode.SCALE) this.app.setCursorImg("hand_closed_cursor");
                return true;
            }
            this.commitPending();
        }

        // A pending shape may have made AppView supply a continuous point, but
        // this branch starts a new shape and must address the containing pixel.
        const drawingPoint = new Point(Math.floor(point.x), Math.floor(point.y));
        this.beginBitmapTransaction();
        this.tracking = true;
        this.pending = false;
        this.drawHistoryPushed = false;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.editingStartState = null;
        this.interactionMode = null;
        this.button = button;
        this.startPoint = drawingPoint;
        this.endPoint = drawingPoint.clone();
        this.pointerStartPoint = drawingPoint.clone();
        this.lastPoint = drawingPoint.clone();
        this.shapeTransform.reset();
        this.curveControlPoints = null;
        this.changedBounds = new Rectangle(drawingPoint.x, drawingPoint.y, 1, 1);
        return true;
    }

    onMouseMove(x, y) {
        const point = new Point(x, y);
        if (!this.tracking) {
            if (this.supportsPendingEdit() && this.pending) this.updateHoverCursor(point);
            return false;
        }
        if (this.interactionMode !== null) {
            this.updateTransformInteraction(point);
        } else {
            this.updateDrawingPoints(point);
        }
        return this.renderPreview();
    }

    onMouseUp(x, y, button) {
        if (!this.supportsPendingEdit()) return super.onMouseUp(x, y, button);
        if (!this.tracking || (this.interactionMode === null && button !== this.button)) return false;
        this.onMouseMove(x, y);
        const editingStartState = this.interactionMode === null ? null : this.editingStartState;
        if (this.interactionMode === null && this.startPoint.equals(this.endPoint)) {
            this.cancelPending();
            return true;
        }
        this.tracking = false;
        this.pending = true;
        this.interactionMode = null;
        this.editingStartState = null;
        this.ensureCurveControlPoints();
        if (this.usesBoundingBoxNubs()) {
            MoveToolBase.prototype.positionNubs.call(this, MoveToolBaseMode.TRANSLATE);
            this.rotateNub.setVisible(false);
        }
        this.positionCurveNubs();
        this.positionGradientNubs();
        this.updateHoverCursor(new Point(x, y));
        this.pushDrawHistoryMemento();
        if (editingStartState !== null) {
            this.historyStack.pushNewMemento(new ShapeEditHistoryMemento(
                this.getDocumentWorkspace(), editingStartState, this.getName(), this.getImage()
            ));
        }
        return true;
    }

    onKeyPress(key) {
        if (!this.supportsPendingEdit() || (!this.pending && !this.tracking)) return false;
        if (key === "Enter") {
            this.commitPending();
            return true;
        }
        if (key === "Escape") {
            if (this.pending && this.drawHistoryPushed) {
                // Ending the drawing placed the editable shape in history.
                // Walk back its edit entries and draw entry so Escape cannot
                // leave a memento that expects a now-missing pending shape.
                while (this.pending) this.historyStack.stepBackward();
            } else {
                this.cancelPending();
            }
            return true;
        }
        return false;
    }

    onPulse() {
        if (this.supportsPendingEdit()) MoveToolBase.prototype.onPulse.call(this);
        else super.onPulse();
    }

    onDeactivate() {
        if (this.colorsForm !== null) {
            this.colorsForm.changed.remove(this.colorsChangedListener);
            this.colorsForm = null;
        }
        if (this.supportsPendingEdit() && (this.pending || this.tracking)) this.commitPending();
        this.destroyNubs();
        super.onDeactivate();
    }

    onColorsChanged() {
        if (this.restoredColors !== null && this.colorsForm !== null) {
            this.restoredColors = {
                primary: this.colorsForm.mainColor.copy(),
                secondary: this.colorsForm.secondaryColor.copy()
            };
        }
        if ((this.pending || this.tracking) && this.startPoint !== null && this.endPoint !== null) {
            this.renderPreview();
        }
    }

    supportsPendingEdit() {
        return true;
    }

    onSettingChanged(key, value) {
        if (this.restoredSettings !== null && key !== undefined) {
            this.restoredSettings[key] = value;
        }
        if ((this.pending || this.tracking) && this.startPoint !== null && this.endPoint !== null) {
            this.renderPreview();
            if (this.pending) {
                if (this.usesBoundingBoxNubs()) {
                    MoveToolBase.prototype.positionNubs.call(this, MoveToolBaseMode.TRANSLATE);
                }
                this.positionCurveNubs();
                this.positionGradientNubs();
            }
        }
    }

    getSetting(name, fallback = null) {
        if (this.restoredSettings !== null
            && Object.prototype.hasOwnProperty.call(this.restoredSettings, name)) {
            return this.restoredSettings[name];
        }
        return super.getSetting(name, fallback);
    }

    getColor(button = MouseButton.LEFT) {
        if (this.restoredColors !== null) {
            return (button === MouseButton.RIGHT
                ? this.restoredColors.secondary : this.restoredColors.primary).copy();
        }
        return super.getColor(button);
    }

    updateDrawingPoints(pointerEndPoint) {
        const origin = this.pointerStartPoint;
        let end = pointerEndPoint.clone();
        let dx = end.x - origin.x;
        let dy = end.y - origin.y;

        if (this.app.isShiftKeyDown()) {
            if (this.shape === "line" || this.shape === "gradient") {
                const length = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                const constrained = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
                dx = Math.cos(constrained) * length;
                dy = Math.sin(constrained) * length;
            } else {
                const extent = Math.max(Math.abs(dx), Math.abs(dy));
                dx = (dx < 0 ? -1 : 1) * extent;
                dy = (dy < 0 ? -1 : 1) * extent;
            }
            end = new Point(origin.x + dx, origin.y + dy);
        }

        this.endPoint = end;
        this.startPoint = this.shape !== "gradient" && this.app.isAltKeyDown()
            ? new Point(origin.x - dx, origin.y - dy)
            : origin.clone();
    }

    getNubBounds() {
        return Utility.pointsToRectangle(this.startPoint, this.endPoint);
    }

    getNubTransform() {
        return this.shapeTransform;
    }

    hasNubTarget() {
        return this.pending || (this.tracking && this.interactionMode !== null);
    }

    usesBoundingBoxNubs() {
        return this.shape !== "line" && this.shape !== "gradient";
    }

    destroyNubs() {
        if (this.moveNubs !== null || this.rotateNub !== null) {
            MoveToolBase.prototype.destroyNubs.call(this);
        }
        if (this.curveNubs !== null) {
            for (const nub of this.curveNubs) {
                this.getSurfaceBox().removeRenderer(nub);
                nub.dispose();
            }
            this.curveNubs = null;
        }
        if (this.gradientNubs !== null) {
            for (const nub of this.gradientNubs) {
                this.getSurfaceBox().removeRenderer(nub);
                nub.dispose();
            }
            this.gradientNubs = null;
        }
    }

    updateHoverCursor(point) {
        for (const nub of this.curveNubs || []) {
            if (nub.isVisible() && nub.isPointTouching(point, true)) {
                this.app.setCursorImg("hand_open_cursor");
                return;
            }
        }
        for (const nub of this.gradientNubs || []) {
            if (nub.isVisible() && nub.isPointTouching(point, true)) {
                this.app.setCursorImg("hand_open_cursor");
                return;
            }
        }
        for (const nub of this.moveNubs || []) {
            if (nub.isVisible() && nub.isPointTouching(point, true)) {
                if (this.rotateIndicator !== null) this.rotateIndicator.setVisible(false);
                this.app.setCursorImg("hand_open_cursor");
                return;
            }
        }
        if (this.usesBoundingBoxNubs()
            && MoveToolBase.prototype.updateRotationIndicator.call(this, point)) {
            this.app.setCursorImg("hand_open_cursor");
            return;
        }
        if (this.rotateIndicator !== null) this.rotateIndicator.setVisible(false);
        this.app.setCursor(this.hitTestPendingShape(point) ? "move" : "crosshair");
    }

    updateTransformInteraction(point) {
        if (this.interactionMode === "curve") {
            const localPoint = point.clone();
            const inverse = this.shapeTransform.clone();
            if (inverse.isInvertible()) inverse.invert();
            inverse.transformPoints([localPoint]);
            localPoint.x = Math.round(localPoint.x);
            localPoint.y = Math.round(localPoint.y);
            if (this.curveControlIndex === 0) {
                this.startPoint = localPoint;
            } else if (this.curveControlIndex === 3) {
                this.endPoint = localPoint;
            } else {
                this.curveControlPoints[this.curveControlIndex - 1] = localPoint;
            }
            this.positionCurveNubs();
            return;
        } else if (this.interactionMode === "gradientPoint") {
            const localPoint = point.clone();
            const inverse = this.shapeTransform.clone();
            if (inverse.isInvertible()) inverse.invert();
            inverse.transformPoints([localPoint]);
            localPoint.x = Math.round(localPoint.x);
            localPoint.y = Math.round(localPoint.y);
            if (this.gradientControlIndex === 0) this.startPoint = localPoint;
            else this.endPoint = localPoint;
            this.positionGradientNubs();
            return;
        } else if (this.interactionMode === MoveToolBaseMode.TRANSLATE) {
            this.shapeTransform = this.originalTransform.clone();
            this.shapeTransform.translate(
                Math.round(point.x - this.interactionStart.x),
                Math.round(point.y - this.interactionStart.y),
                MatrixOrder.APPEND
            );
        } else if (this.interactionMode === MoveToolBaseMode.ROTATE) {
            const bounds = Utility.pointsToRectangle(this.originalStartPoint, this.originalEndPoint);
            let center = new Point(bounds.getLeft() + bounds.getWidth() / 2,
                bounds.getTop() + bounds.getHeight() / 2);
            center = Utility.transformOnePoint(this.originalTransform, center);
            const theta1 = Math.atan2(this.interactionStart.y - center.y, this.interactionStart.x - center.x);
            const theta2 = Math.atan2(point.y - center.y, point.x - center.x);
            this.angleDelta = (theta2 - theta1) * 180 / Math.PI;
            let angle = this.startAngle + this.angleDelta;
            if (this.app.isShiftKeyDown()) {
                angle = MoveToolBase.prototype.constrainAngle.call(this, angle);
                this.angleDelta = angle - this.startAngle;
            }
            this.shapeTransform = this.originalTransform.clone();
            this.shapeTransform.rotateAt(this.angleDelta, center, MatrixOrder.APPEND);
            this.rotateNub.setLocation(center);
            this.rotateNub.setAngle(this.startAngle + this.angleDelta);
            const directions = ["ew", "nwse", "ns", "nesw"];
            const index = Math.abs(Math.floor(-this.angleDelta / 45 - 45 / 2) + 1) % 4;
            this.app.setCursor(directions[index] + "-resize");
        } else if (this.interactionMode === MoveToolBaseMode.SCALE) {
            const localPoint = point.clone();
            const inverse = this.originalTransform.clone();
            if (inverse.isInvertible()) inverse.invert();
            inverse.transformPoints([localPoint]);
            localPoint.x = Math.round(localPoint.x);
            localPoint.y = Math.round(localPoint.y);

            let left = Math.min(this.originalStartPoint.x, this.originalEndPoint.x);
            let top = Math.min(this.originalStartPoint.y, this.originalEndPoint.y);
            let right = Math.max(this.originalStartPoint.x, this.originalEndPoint.x);
            let bottom = Math.max(this.originalStartPoint.y, this.originalEndPoint.y);
            const originalWidth = Math.max(1, right - left);
            const originalHeight = Math.max(1, bottom - top);
            const edge = this.interactionEdge;
            if ([MoveToolBaseEdge.TOP_LEFT, MoveToolBaseEdge.LEFT, MoveToolBaseEdge.BOTTOM_LEFT].includes(edge)) left = localPoint.x;
            if ([MoveToolBaseEdge.TOP_RIGHT, MoveToolBaseEdge.RIGHT, MoveToolBaseEdge.BOTTOM_RIGHT].includes(edge)) right = localPoint.x;
            if ([MoveToolBaseEdge.TOP_LEFT, MoveToolBaseEdge.TOP, MoveToolBaseEdge.TOP_RIGHT].includes(edge)) top = localPoint.y;
            if ([MoveToolBaseEdge.BOTTOM_LEFT, MoveToolBaseEdge.BOTTOM, MoveToolBaseEdge.BOTTOM_RIGHT].includes(edge)) bottom = localPoint.y;

            const isCorner = [MoveToolBaseEdge.TOP_LEFT, MoveToolBaseEdge.TOP_RIGHT,
                MoveToolBaseEdge.BOTTOM_LEFT, MoveToolBaseEdge.BOTTOM_RIGHT].includes(edge);
            if (isCorner && this.app.isShiftKeyDown()) {
                const scale = Math.max(Math.abs(right - left) / originalWidth,
                    Math.abs(bottom - top) / originalHeight);
                const width = originalWidth * scale;
                const height = originalHeight * scale;
                if ([MoveToolBaseEdge.TOP_LEFT, MoveToolBaseEdge.BOTTOM_LEFT].includes(edge)) left = right - width;
                else right = left + width;
                if ([MoveToolBaseEdge.TOP_LEFT, MoveToolBaseEdge.TOP_RIGHT].includes(edge)) top = bottom - height;
                else bottom = top + height;
            }

            this.startPoint = new Point(left, top);
            this.endPoint = new Point(right, bottom);
            this.shapeTransform = this.originalTransform.clone();
            this.app.setCursorImg("hand_closed_cursor");
        }

        if (this.usesBoundingBoxNubs()) {
            MoveToolBase.prototype.positionNubs.call(this, this.interactionMode);
            this.rotateNub.setVisible(this.interactionMode === MoveToolBaseMode.ROTATE);
        }
        this.positionCurveNubs();
        this.positionGradientNubs();
    }

    renderPreview() {
        const surface = this.getActiveLayer().getSurface();
        const previousBounds = this.changedBounds;
        const nextBounds = this.getPreviewBounds();
        const dirtyBounds = Rectangle.intersect(Rectangle.union(previousBounds, nextBounds), surface.getBounds());
        surface.copyRegionFrom(this.scratchSurface, dirtyBounds);

        const destinationContext = surface.context;
        const width = this.getWidth();
        const antialias = this.getSetting("antialias", true) !== false;
        // Canvas2D exposes image smoothing for bitmap operations only; it has
        // no switch for vector-path antialiasing. Render aliased shapes
        // into an isolated surface so their coverage can be reduced to whole
        // pixels before the shape is composited onto the layer.
        let aliasedCanvas = null;
        let context = destinationContext;
        if (!antialias) {
            aliasedCanvas = document.createElement("canvas");
            aliasedCanvas.width = surface.width;
            aliasedCanvas.height = surface.height;
            context = aliasedCanvas.getContext("2d", {alpha: true});
        }
        context.save();
        // imageSmoothingEnabled does not disable path antialiasing, but it is
        // still important for any bitmap-backed fill styles used by shapes.
        // The 1px rectangle path below additionally uses pixel fills in
        // aliased mode because Canvas2D has no vector-path AA switch.
        context.imageSmoothingEnabled = antialias;
        this.clipToSelection(context);
        context.globalCompositeOperation = aliasedCanvas === null
            ? this.getCompositeOperation() : "source-over";
        const matrix = this.shapeTransform.getElements();
        context.transform(matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], matrix[0][2], matrix[1][2]);
        context.strokeStyle = this.shape === "line"
            ? this.createFillStyle(context, this.getColor(this.button),
                this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT))
            : this.getColor(this.button).toHex();
        context.lineWidth = width;
        const startCap = this.getSetting("startCap", "flat");
        const endCap = this.getSetting("endCap", "flat");
        context.lineCap = this.shape === "line" && startCap === "round" && endCap === "round" ? "round" : "butt";
        // Paint.NET's shape pen uses miter joins. Round joins add coverage
        // around rectangle corners and make a 1px outline look wider than it
        // is (especially when the browser antialiases the path).
        context.lineJoin = "miter";
        const dash = this.getSetting("dash", "solid");
        const dashPatterns = {
            dash: [4, 2],
            dot: [1, 2],
            dashDot: [4, 2, 1, 2],
            dashDotDot: [4, 2, 1, 2, 1, 2]
        };
        if (this.shape !== "gradient") {
            context.setLineDash((dashPatterns[dash] || []).map(value => value * width));
        }
        context.beginPath();
        let catalogPath = null;
        const drawType = this.getSetting("drawType", this.getSetting("fillMode", "outline"));
        let rectangleInterior = null;
        let rectangleOutline = null;
        let aliasedRectangle = false;
        if (this.shape === "line") {
            context.moveTo(this.startPoint.x + 0.5, this.startPoint.y + 0.5);
            const curveType = this.getSetting("curveType", "spline");
            if (this.curveControlPoints === null) {
                context.lineTo(this.endPoint.x + 0.5, this.endPoint.y + 0.5);
            } else if (curveType === "bezier") {
                const c1 = this.curveControlPoints[0];
                const c2 = this.curveControlPoints[1];
                context.bezierCurveTo(c1.x + 0.5, c1.y + 0.5,
                    c2.x + 0.5, c2.y + 0.5,
                    this.endPoint.x + 0.5, this.endPoint.y + 0.5);
            } else if (curveType === "spline") {
                this.addSplinePath(context, [this.startPoint, ...this.curveControlPoints, this.endPoint]);
            } else {
                context.lineTo(this.curveControlPoints[0].x + 0.5, this.curveControlPoints[0].y + 0.5);
                context.lineTo(this.curveControlPoints[1].x + 0.5, this.curveControlPoints[1].y + 0.5);
                context.lineTo(this.endPoint.x + 0.5, this.endPoint.y + 0.5);
            }
        } else {
            const shape = this.getSetting("shape", this.shape);
            const rect = Utility.pointsToRectangle(this.startPoint, this.endPoint);
            if (shape === "rectangle") {
                // Paint.NET constructs separate geometries for a rectangle's
                // interior and outline. The outline is centered on a path
                // inset by half the pen width; the interior is inset by the
                // full width when both are requested. Using the outer path
                // for both causes a 1px stroke to cover neighbouring pixels.
                const hasOutline = ["outline", "both", "fillOutline"].includes(drawType);
                const hasInterior = ["fill", "both", "fillOutline"].includes(drawType);
                const outlineRect = hasOutline
                    ? new Rectangle(
                        rect.x + width / 2,
                        rect.y + width / 2,
                        Math.max(0, rect.width - width),
                        Math.max(0, rect.height - width))
                    : rect;
                rectangleOutline = outlineRect;
                aliasedRectangle = !antialias && width === 1 && this.shapeTransform.isIdentity();
                if (hasInterior && hasOutline) {
                    rectangleInterior = new Rectangle(
                        rect.x + width,
                        rect.y + width,
                        Math.max(0, rect.width - width * 2),
                        Math.max(0, rect.height - width * 2));
                }
                context.rect(outlineRect.x, outlineRect.y,
                    outlineRect.width, outlineRect.height);
            } else if (typeof ShapeCatalog !== "undefined" && ShapeCatalog.has(shape)) {
                catalogPath = ShapeCatalog.createPath(shape, rect);
            } else if (shape === "ellipse") {
                context.ellipse(rect.x + rect.width / 2, rect.y + rect.height / 2,
                    Math.max(0.5, rect.width / 2), Math.max(0.5, rect.height / 2), 0, 0, Math.PI * 2);
            } else if (shape === "roundedRectangle") {
                // RoundedRectangleShape derives from RectangleShapeBase in
                // Paint.NET, so its outline geometry is inset by half the
                // pen width as well. Stroking the outer bounds directly makes
                // a 1px rounded outline occupy two pixels at its sides.
                const hasOutline = ["outline", "both", "fillOutline"].includes(drawType);
                const roundedRect = hasOutline
                    ? new Rectangle(
                        rect.x + width / 2,
                        rect.y + width / 2,
                        Math.max(0, rect.width - width),
                        Math.max(0, rect.height - width))
                    : rect;
                const radius = Utility.clamp(Number(this.getSetting("radius", 10)), 0,
                    Math.min(roundedRect.width, roundedRect.height) / 2);
                context.roundRect(roundedRect.x, roundedRect.y,
                    roundedRect.width, roundedRect.height,
                    radius);
            } else if (shape === "triangle") {
                this.addNormalizedPath(context, rect, [[0.5, 0], [0, 1], [1, 1]]);
            } else if (shape === "rightTriangle") {
                this.addNormalizedPath(context, rect, [[0, 0], [0, 1], [1, 1]]);
            } else if (shape === "diamond") {
                this.addNormalizedPath(context, rect, [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]);
            } else if (shape === "trapezoid") {
                this.addNormalizedPath(context, rect, [[0.25, 0], [0.75, 0], [1, 1], [0, 1]]);
            } else if (shape === "parallelogram") {
                this.addNormalizedPath(context, rect, [[1, 0], [0.75, 1], [0, 1], [0.25, 0]]);
            } else if (/^(pentagon|hexagon|heptagon|octagon)$/.test(shape)) {
                const sides = {pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8}[shape];
                this.addRegularPolygonPath(context, rect, sides, shape === "octagon" ? 22.5 : 0);
            } else if (/^star[3-6]$/.test(shape)) {
                const sides = Number(shape.substring(4));
                const ratios = {3: 0.2, 4: 0.25, 5: 0.381966, 6: 0.57735};
                this.addStarPath(context, rect, sides, ratios[sides]);
            } else if (shape === "blockArrow") {
                this.addNormalizedPath(context, rect,
                    [[1, 0.5], [0.5, 0], [0.5, 0.25], [0, 0.25], [0, 0.75], [0.5, 0.75], [0.5, 1]]);
            } else if (shape === "notchedArrow") {
                this.addNormalizedPath(context, rect,
                    [[1, 0.5], [0.5, 0], [0.5, 0.25], [0, 0.25], [0.25, 0.5], [0, 0.75], [0.5, 0.75], [0.5, 1]]);
            } else if (shape === "pentagonArrow") {
                this.addNormalizedPath(context, rect, [[1, 0.5], [0.5, 0], [0, 0], [0, 1], [0.5, 1]]);
            } else if (shape === "chevronArrow") {
                this.addNormalizedPath(context, rect,
                    [[0, 0], [1 / 3, 0.5], [0, 1], [2 / 3, 1], [1, 0.5], [2 / 3, 0]]);
            } else if (shape === "checkMark") {
                this.addNormalizedPath(context, rect,
                    [[0.85, 0], [1, 0.15], [0.375, 1], [0, 0.625], [0.15, 0.475], [0.352, 0.677]]);
            } else if (shape === "multiply") {
                const m = 0.15;
                this.addNormalizedPath(context, rect, [
                    [m, 0], [0.5, 0.5 - m], [1 - m, 0], [1, m],
                    [0.5 + m, 0.5], [1, 1 - m], [1 - m, 1], [0.5, 0.5 + m],
                    [m, 1], [0, 1 - m], [0.5 - m, 0.5], [0, m]
                ]);
            } else if (shape === "heart") {
                this.addHeartPath(context, rect);
            } else if (shape === "lightningBolt") {
                this.addAbsoluteNormalizedPath(context, rect, [
                    [29.965, 0.5047], [0.5047, 18.514], [26.9396, 39.3102],
                    [17.968, 45.4352], [43.0051, 64.8427], [35.3201, 69.5556],
                    [75.6158, 100.505], [51.855, 60.1204], [58.149, 56.0927],
                    [39.2442, 32.3176], [44.0417, 28.4428]
                ]);
            } else if (shape === "gear") {
                this.addGearPath(context, rect);
            } else if (shape === "rectangularCallout") {
                this.addNormalizedPath(context, rect,
                    [[0, 0], [1, 0], [1, 0.75], [0.25, 0.75], [0, 1], [0.125, 0.75], [0, 0.75]]);
            } else if (shape === "roundedCallout") {
                this.addRoundedCalloutPath(context, rect);
            } else if (shape === "ellipticalCallout") {
                this.addEllipticalCalloutPath(context, rect);
            } else if (shape === "cloudCallout") {
                this.addCloudCalloutPath(context, rect);
            } else {
                context.rect(rect.x, rect.y, rect.width, rect.height);
            }
        }
        if (this.shape === "line") {
            context.stroke();
            context.setLineDash([]);
            if (startCap !== "flat" || endCap !== "flat") {
                this.drawLineCap(context, this.startPoint, this.endPoint, startCap, width);
                this.drawLineCap(context, this.endPoint, this.startPoint, endCap, width);
            }
        } else {
            if (aliasedRectangle) {
                const left = Math.floor(this.startPoint.x);
                const top = Math.floor(this.startPoint.y);
                const right = Math.ceil(this.endPoint.x);
                const bottom = Math.ceil(this.endPoint.y);
                const fillButton = ["both", "fillOutline"].includes(drawType)
                    ? (this.button === MouseButton.RIGHT ? MouseButton.LEFT : MouseButton.RIGHT)
                    : this.button;
                const hasInterior = ["fill", "both", "fillOutline"].includes(drawType);
                const hasOutline = ["outline", "both", "fillOutline"].includes(drawType);

                if (hasInterior) {
                    context.fillStyle = this.createFillStyle(context, this.getColor(fillButton), this.getColor(this.button));
                    const inset = hasOutline ? 1 : 0;
                    context.fillRect(left + inset, top + inset,
                        Math.max(0, right - left - inset * 2),
                        Math.max(0, bottom - top - inset * 2));
                }
                if (hasOutline) {
                    context.fillStyle = this.createFillStyle(context, this.getColor(this.button),
                        this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT));
                    context.fillRect(left, top, right - left, 1);
                    context.fillRect(left, Math.max(top, bottom - 1), right - left, 1);
                    context.fillRect(left, top + 1, 1, Math.max(0, bottom - top - 2));
                    context.fillRect(Math.max(left, right - 1), top + 1, 1, Math.max(0, bottom - top - 2));
                }
            } else if (["fill", "both", "fillOutline"].includes(drawType)) {
                const fillButton = ["both", "fillOutline"].includes(drawType)
                    ? (this.button === MouseButton.RIGHT ? MouseButton.LEFT : MouseButton.RIGHT)
                    : this.button;
                context.fillStyle = this.createFillStyle(context, this.getColor(fillButton), this.getColor(this.button));
                if (rectangleInterior !== null) {
                    context.save();
                    context.beginPath();
                    context.rect(rectangleInterior.x, rectangleInterior.y,
                        rectangleInterior.width, rectangleInterior.height);
                    context.fill();
                    context.restore();
                } else if (catalogPath === null) context.fill();
                else context.fill(catalogPath, "evenodd");
            }
            if (["outline", "both", "fillOutline"].includes(drawType)) {
                // Filling the separately inset interior replaced the current
                // canvas path, so restore the outline geometry before stroking.
                if (rectangleOutline !== null && rectangleInterior !== null) {
                    context.beginPath();
                    context.rect(rectangleOutline.x, rectangleOutline.y,
                        rectangleOutline.width, rectangleOutline.height);
                }
                if (catalogPath === null) context.stroke();
                else context.stroke(catalogPath);
            }
        }
        context.restore();
        if (aliasedCanvas !== null) {
            const x = dirtyBounds.getLeft();
            const y = dirtyBounds.getTop();
            const pixels = context.getImageData(x, y, dirtyBounds.getWidth(), dirtyBounds.getHeight());
            // Convert antialiased path coverage into a bi-level mask. Keep
            // the selected color's opacity: thresholding against 128 would
            // erase every aliased line drawn with less than 50% opacity.
            const candidateColors = [
                this.getColor(this.button),
                this.getColor(this.button === MouseButton.LEFT
                    ? MouseButton.RIGHT : MouseButton.LEFT)
            ];
            for (let i = 0; i < pixels.data.length; i += 4) {
                let nearest = candidateColors[0];
                let nearestDistance = Infinity;
                for (const color of candidateColors) {
                    const red = pixels.data[i] - color.red;
                    const green = pixels.data[i + 1] - color.green;
                    const blue = pixels.data[i + 2] - color.blue;
                    const distance = red * red + green * green + blue * blue;
                    if (distance < nearestDistance) {
                        nearest = color;
                        nearestDistance = distance;
                    }
                }
                pixels.data[i + 3] = nearest.alpha > 0
                    && pixels.data[i + 3] >= nearest.alpha / 2
                    ? nearest.alpha : 0;
            }
            context.putImageData(pixels, x, y);
            destinationContext.save();
            destinationContext.globalCompositeOperation = this.getCompositeOperation();
            destinationContext.drawImage(aliasedCanvas, 0, 0);
            destinationContext.restore();
        }
        this.lastPoint = this.endPoint.clone();
        this.changedBounds = nextBounds;
        this.markBitmapTransactionDirty(nextBounds);
        this.getActiveLayer().invalidate(dirtyBounds);
        return true;
    }

    addNormalizedPath(context, rect, points) {
        context.moveTo(rect.x + points[0][0] * rect.width, rect.y + points[0][1] * rect.height);
        for (let i = 1; i < points.length; ++i) {
            context.lineTo(rect.x + points[i][0] * rect.width, rect.y + points[i][1] * rect.height);
        }
        context.closePath();
    }

    addRegularPolygonPath(context, rect, sides, rotationDegrees = 0) {
        const points = [];
        const rotation = -Math.PI / 2 + rotationDegrees * Math.PI / 180;
        for (let i = 0; i < sides; ++i) {
            const angle = rotation + i * Math.PI * 2 / sides;
            points.push([0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5]);
        }
        this.addNormalizedPath(context, rect, points);
    }

    addGearPath(context, rect) {
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const teeth = 12;
        for (let i = 0; i < teeth * 4; ++i) {
            const phase = i % 4;
            const radius = phase === 0 || phase === 1 ? 0.5 : 0.39;
            const angle = -Math.PI / 2 + i * Math.PI * 2 / (teeth * 4);
            const x = centerX + Math.cos(angle) * rect.width * radius;
            const y = centerY + Math.sin(angle) * rect.height * radius;
            if (i === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.closePath();
        context.moveTo(centerX + rect.width * 0.185, centerY);
        context.ellipse(centerX, centerY, rect.width * 0.185, rect.height * 0.185,
            0, 0, Math.PI * 2, true);
        context.closePath();
    }

    addRoundedCalloutPath(context, rect) {
        const x = rect.x, y = rect.y, w = rect.width, h = rect.height;
        const bottom = y + h * 0.75;
        const radius = Math.min(w, h) * 0.08;
        context.moveTo(x + radius, y);
        context.lineTo(x + w - radius, y);
        context.quadraticCurveTo(x + w, y, x + w, y + radius);
        context.lineTo(x + w, bottom - radius);
        context.quadraticCurveTo(x + w, bottom, x + w - radius, bottom);
        context.lineTo(x + w * 0.28, bottom);
        context.lineTo(x, y + h);
        context.lineTo(x + w * 0.11, bottom);
        context.lineTo(x + radius, bottom);
        context.quadraticCurveTo(x, bottom, x, bottom - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }

    addEllipticalCalloutPath(context, rect) {
        const p = (x, y) => [rect.x + x * rect.width / 100, rect.y + y * rect.height / 100];
        let point = p(0.195, 44.743);
        context.moveTo(point[0], point[1]);
        let a = p(0.195, 20.032), b = p(22.342, 0), c = p(49.902, 0);
        context.bezierCurveTo(...a, ...b, ...c);
        a = p(77.658, 0); b = p(99.805, 20.032); c = p(99.805, 44.743);
        context.bezierCurveTo(...a, ...b, ...c);
        a = p(100, 69.453); b = p(77.463, 89.485); c = p(49.902, 89.485);
        context.bezierCurveTo(...a, ...b, ...c);
        a = p(42.201, 89.485); b = p(34.538, 87.841); c = p(27.901, 84.913);
        context.bezierCurveTo(...a, ...b, ...c);
        context.lineTo(...p(0, 100));
        context.lineTo(...p(14.441, 76.045));
        a = p(5.628, 67.976); b = p(0, 56.928); c = p(0.195, 44.743);
        context.bezierCurveTo(...a, ...b, ...c);
        context.closePath();
    }

    addCloudCalloutPath(context, rect) {
        const outline = [
            [0.12, 0.48], [0.09, 0.35], [0.18, 0.25], [0.22, 0.12],
            [0.38, 0.12], [0.45, 0.04], [0.58, 0.1], [0.68, 0.04],
            [0.78, 0.14], [0.91, 0.15], [0.93, 0.32], [1, 0.42],
            [0.92, 0.56], [0.87, 0.7], [0.69, 0.68], [0.58, 0.76],
            [0.42, 0.69], [0.27, 0.72], [0.2, 0.6]
        ];
        const point = value => new Point(rect.x + value[0] * rect.width, rect.y + value[1] * rect.height);
        const first = point(outline[0]);
        const last = point(outline[outline.length - 1]);
        context.moveTo((first.x + last.x) / 2, (first.y + last.y) / 2);
        for (let i = 0; i < outline.length; ++i) {
            const current = point(outline[i]);
            const next = point(outline[(i + 1) % outline.length]);
            context.quadraticCurveTo(current.x, current.y,
                (current.x + next.x) / 2, (current.y + next.y) / 2);
        }
        context.closePath();
        for (const [cx, cy, radius] of [[0.2, 0.78, 0.075], [0.1, 0.88, 0.05], [0.035, 0.96, 0.025]]) {
            const pixelRadius = Math.max(0.5, radius * Math.min(rect.width, rect.height));
            context.moveTo(rect.x + cx * rect.width + pixelRadius, rect.y + cy * rect.height);
            context.arc(rect.x + cx * rect.width, rect.y + cy * rect.height,
                pixelRadius, 0, Math.PI * 2);
        }
    }

    addStarPath(context, rect, sides, innerRatio) {
        const points = [];
        for (let i = 0; i < sides * 2; ++i) {
            const radius = i % 2 === 0 ? 0.5 : 0.5 * innerRatio;
            const angle = -Math.PI / 2 + i * Math.PI / sides;
            points.push([0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius]);
        }
        this.addNormalizedPath(context, rect, points);
    }

    addAbsoluteNormalizedPath(context, rect, points) {
        const xs = points.map(point => point[0]);
        const ys = points.map(point => point[1]);
        const left = Math.min(...xs), top = Math.min(...ys);
        const width = Math.max(...xs) - left || 1;
        const height = Math.max(...ys) - top || 1;
        this.addNormalizedPath(context, rect,
            points.map(point => [(point[0] - left) / width, (point[1] - top) / height]));
    }

    addHeartPath(context, rect) {
        const left = 11.5, top = 11.9167, width = 25, height = 23.6666;
        const point = (x, y) => [rect.x + (x - left) / width * rect.width,
            rect.y + (y - top) / height * rect.height];
        const start = point(11.5, 20.5834);
        context.moveTo(start[0], start[1]);
        const curves = [
            [10.3333, 16.25, 13.6667, 12.9167, 16.5, 12.4167],
            [19.3334, 11.9167, 21.6667, 14.25, 24, 16.5833],
            [26.3334, 14.25, 28.6667, 11.9167, 31.5, 12.4167],
            [34.3333, 12.9167, 37.6666, 16.25, 36.5, 20.5833],
            [35.3333, 24.9167, 29.6667, 30.25, 24, 35.5833],
            [18.3334, 30.25, 12.6667, 24.9167, 11.5, 20.5834]
        ];
        for (const curve of curves) {
            const c1 = point(curve[0], curve[1]);
            const c2 = point(curve[2], curve[3]);
            const end = point(curve[4], curve[5]);
            context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
        }
        context.closePath();
    }

    ensureCurveControlPoints() {
        if (this.shape !== "line") return;
        if (this.curveControlPoints === null) {
            const dx = this.endPoint.x - this.startPoint.x;
            const dy = this.endPoint.y - this.startPoint.y;
            this.curveControlPoints = [
                new Point(this.startPoint.x + dx / 3, this.startPoint.y + dy / 3),
                new Point(this.startPoint.x + dx * 2 / 3, this.startPoint.y + dy * 2 / 3)
            ];
        }
    }

    beginGradientControlInteraction(point) {
        this.positionGradientNubs();
        if (this.gradientNubs === null) return false;
        for (let i = 0; i < this.gradientNubs.length; ++i) {
            if (!this.gradientNubs[i].isPointTouching(point, true)) continue;
            this.tracking = true;
            this.interactionMode = "gradientPoint";
            this.gradientControlIndex = i;
            this.interactionStart = point;
            this.originalStartPoint = this.startPoint.clone();
            this.originalEndPoint = this.endPoint.clone();
            this.originalTransform = this.shapeTransform.clone();
            this.editingStartState = this.capturePendingState();
            this.app.setCursorImg("hand_closed_cursor");
            return true;
        }
        return false;
    }

    positionGradientNubs() {
        if (this.shape !== "gradient" || !this.pending) {
            for (const nub of this.gradientNubs || []) nub.setVisible(false);
            return;
        }
        if (this.gradientNubs === null) {
            this.gradientNubs = Array.from({length: 2}, () => new MoveNubRenderer(this.getSurfaceBox()));
            for (const nub of this.gradientNubs) {
                nub.setShape(MoveNubShape.CIRCLE);
                this.getSurfaceBox().addRenderer(nub);
            }
        }
        const points = [this.startPoint, this.endPoint];
        for (let i = 0; i < this.gradientNubs.length; ++i) {
            this.gradientNubs[i].setLocation(points[i]);
            this.gradientNubs[i].setTransform(this.shapeTransform);
            this.gradientNubs[i].setVisible(true);
        }
    }

    beginCurveControlInteraction(point) {
        this.ensureCurveControlPoints();
        if (this.curveControlPoints === null) return false;
        this.positionCurveNubs();
        for (let i = 0; i < this.curveNubs.length; ++i) {
            if (!this.curveNubs[i].isPointTouching(point, true)) continue;
            this.tracking = true;
            this.interactionMode = "curve";
            this.curveControlIndex = i;
            this.interactionStart = point;
            this.originalStartPoint = this.startPoint.clone();
            this.originalEndPoint = this.endPoint.clone();
            this.originalTransform = this.shapeTransform.clone();
            this.editingStartState = this.capturePendingState();
            this.app.setCursorImg("hand_closed_cursor");
            return true;
        }
        return false;
    }

    positionCurveNubs() {
        if (this.shape !== "line" || !this.pending) {
            for (const nub of this.curveNubs || []) nub.setVisible(false);
            return;
        }
        this.ensureCurveControlPoints();
        if (this.curveNubs === null) {
            // LineCurveShape in Paint.NET 5 exposes four path-property nubs:
            // start, two curve controls, and end.
            this.curveNubs = Array.from({length: 4}, () => new MoveNubRenderer(this.getSurfaceBox()));
            for (const nub of this.curveNubs) {
                nub.setShape(MoveNubShape.CIRCLE);
                // Line control points are small and can overlap the stroke.
                // Give them a larger invisible target without changing their
                // painted size.
                nub.setHitTestPadding(14);
                this.getSurfaceBox().addRenderer(nub);
            }
        }
        const points = [this.startPoint, ...this.curveControlPoints, this.endPoint];
        for (let i = 0; i < this.curveNubs.length; ++i) {
            // The path is snapped to pixel centers (see renderPreview and
            // addSplinePath). Use that identical coordinate for the handle;
            // a 0.5 document-pixel mismatch becomes very large at high zoom.
            this.curveNubs[i].setLocation(new Point(points[i].x + 0.5, points[i].y + 0.5));
            this.curveNubs[i].setTransform(this.shapeTransform);
            this.curveNubs[i].setVisible(true);
        }
    }

    addSplinePath(context, points) {
        for (const segment of this.getSplineSegments(points)) {
            context.bezierCurveTo(
                segment.control1.x + 0.5, segment.control1.y + 0.5,
                segment.control2.x + 0.5, segment.control2.y + 0.5,
                segment.end.x + 0.5, segment.end.y + 0.5
            );
        }
    }

    getSplineSegments(points) {
        const segments = [];
        for (let i = 0; i < points.length - 1; ++i) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            segments.push({
                control1: new Point(
                    p1.x + (p2.x - p0.x) / 6,
                    p1.y + (p2.y - p0.y) / 6
                ),
                control2: new Point(
                    p2.x - (p3.x - p1.x) / 6,
                    p2.y - (p3.y - p1.y) / 6
                ),
                end: p2
            });
        }
        return segments;
    }

    getPreviewBounds() {
        if (this.shape === "line") {
            const linePoints = [this.startPoint, ...(this.curveControlPoints || []), this.endPoint];
            const geometryPoints = linePoints.map(point => new Point(point.x + 0.5, point.y + 0.5));
            if (this.getSetting("curveType", "spline") === "spline") {
                for (const segment of this.getSplineSegments(linePoints)) {
                    geometryPoints.push(new Point(segment.control1.x + 0.5, segment.control1.y + 0.5));
                    geometryPoints.push(new Point(segment.control2.x + 0.5, segment.control2.y + 0.5));
                }
            }
            this.shapeTransform.transformPoints(geometryPoints);
            const xs = geometryPoints.map(point => point.x);
            const ys = geometryPoints.map(point => point.y);
            const bounds = Rectangle.absolute(
                Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)
            );
            // Include stroke width and the largest arrow-cap footprint. Cubic
            // Bézier curves stay inside the convex hull of these points.
            const padding = this.getWidth() * 3 + 3;
            bounds.inflate(padding, padding);
            return Utility.roundRectangle(bounds);
        }
        const bounds = Utility.pointsToRectangle(this.startPoint, this.endPoint);
        const width = this.getWidth();
        const padding = width + 2;
        bounds.inflate(padding, padding);
        const corners = [
            new Point(bounds.getLeft(), bounds.getTop()), new Point(bounds.getRight(), bounds.getTop()),
            new Point(bounds.getRight(), bounds.getBottom()), new Point(bounds.getLeft(), bounds.getBottom())
        ];
        this.shapeTransform.transformPoints(corners);
        const xs = corners.map(point => point.x);
        const ys = corners.map(point => point.y);
        return Utility.roundRectangle(Rectangle.absolute(
            Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)
        ));
    }

    hitTestPendingShape(point) {
        if (!this.pending || this.startPoint === null || this.endPoint === null) return false;
        const localPoint = point.clone();
        const inverse = this.shapeTransform.clone();
        if (!inverse.isInvertible()) return false;
        inverse.invert();
        inverse.transformPoints([localPoint]);
        if (this.shape !== "line" && this.shape !== "gradient") {
            return Utility.pointsToRectangle(this.startPoint, this.endPoint).contains(localPoint);
        }

        const dx = this.endPoint.x - this.startPoint.x;
        const dy = this.endPoint.y - this.startPoint.y;
        const lengthSquared = dx * dx + dy * dy;
        let t = lengthSquared > 0
            ? ((localPoint.x - this.startPoint.x) * dx + (localPoint.y - this.startPoint.y) * dy) / lengthSquared
            : 0;
        t = Utility.clamp(t, 0, 1);
        const nearestX = this.startPoint.x + dx * t;
        const nearestY = this.startPoint.y + dy * t;
        return Math.hypot(localPoint.x - nearestX, localPoint.y - nearestY) <= Math.max(6, this.getWidth() * 2);
    }

    commitStroke() {
        if (!this.supportsPendingEdit()) super.commitStroke();
        else this.commitPending();
    }

    commitPending() {
        if (!this.pending && !this.tracking) return false;
        const state = this.capturePendingState();
        this.tracking = false;
        this.pending = false;
        this.interactionMode = null;
        this.editingStartState = null;
        this.destroyNubs();
        this.markBitmapTransactionDirty(this.getClippedChangedBounds());
        const bitmapMemento = this.takeBitmapTransactionMemento();
        if (bitmapMemento !== null) {
            this.historyStack.pushNewMemento(new ShapeCommitHistoryMemento(
                this.getDocumentWorkspace(), state, bitmapMemento,
                this.getName(), this.getImage(), true
            ));
        }
        this.drawHistoryPushed = false;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.app.setCursor("crosshair");
        return true;
    }

    cancelPending() {
        if (!this.pending && !this.tracking) return false;
        this.cancelBitmapTransaction();
        this.tracking = false;
        this.pending = false;
        this.interactionMode = null;
        this.editingStartState = null;
        this.destroyNubs();
        this.drawHistoryPushed = false;
        this.restoredSettings = null;
        this.restoredColors = null;
        this.app.setCursor("crosshair");
        return true;
    }

    pushDrawHistoryMemento() {
        if (this.drawHistoryPushed) return;
        this.historyStack.pushNewMemento(new ShapeDrawHistoryMemento(
            this.getDocumentWorkspace(), this.getName(), this.getImage()
        ));
        this.drawHistoryPushed = true;
    }

    capturePendingState() {
        const colors = this.colorsForm === null ? null : {
            primary: this.colorsForm.mainColor.copy(),
            secondary: this.colorsForm.secondaryColor.copy()
        };
        return {
            startPoint: this.startPoint.clone(),
            endPoint: this.endPoint.clone(),
            pointerStartPoint: this.pointerStartPoint === null ? null : this.pointerStartPoint.clone(),
            lastPoint: this.lastPoint === null ? null : this.lastPoint.clone(),
            changedBounds: this.changedBounds === null ? null : this.changedBounds.clone(),
            shapeTransform: this.shapeTransform.clone(),
            curveControlPoints: this.curveControlPoints === null ? null
                : this.curveControlPoints.map(point => point.clone()),
            button: this.button,
            settings: Object.assign({}, this.restoredSettings === null
                ? this.type.settings : this.restoredSettings),
            colors: this.restoredColors === null ? colors : {
                primary: this.restoredColors.primary.copy(),
                secondary: this.restoredColors.secondary.copy()
            }
        };
    }

    restorePendingState(state) {
        if (this.bitmapTransaction !== null) this.cancelBitmapTransaction();
        this.beginBitmapTransaction();
        this.startPoint = state.startPoint.clone();
        this.endPoint = state.endPoint.clone();
        this.pointerStartPoint = state.pointerStartPoint === null ? null : state.pointerStartPoint.clone();
        this.lastPoint = state.lastPoint === null ? null : state.lastPoint.clone();
        this.shapeTransform = state.shapeTransform.clone();
        this.curveControlPoints = state.curveControlPoints === null ? null
            : state.curveControlPoints.map(point => point.clone());
        this.button = state.button;
        this.restoredSettings = Object.assign({}, state.settings);
        this.restoredColors = state.colors === null ? null : {
            primary: state.colors.primary.copy(),
            secondary: state.colors.secondary.copy()
        };
        this.tracking = false;
        this.pending = true;
        this.interactionMode = null;
        this.editingStartState = null;
        this.drawHistoryPushed = true;
        this.changedBounds = state.changedBounds === null ? this.getPreviewBounds() : state.changedBounds.clone();
        this.renderPreview();
        if (this.usesBoundingBoxNubs()) {
            MoveToolBase.prototype.positionNubs.call(this, MoveToolBaseMode.TRANSLATE);
            this.rotateNub.setVisible(false);
        }
        this.positionCurveNubs();
        this.positionGradientNubs();
        this.app.setCursor("crosshair");
    }

    drawLineCap(context, point, other, cap, width) {
        if (cap === "flat") return;
        if (cap === "round") {
            context.beginPath();
            context.arc(point.x + 0.5, point.y + 0.5, width / 2, 0, Math.PI * 2);
            context.fillStyle = context.strokeStyle;
            context.fill();
            return;
        }
        const angle = Math.atan2(point.y - other.y, point.x - other.x);
        const length = Math.max(6, width * 3);
        const halfWidth = Math.max(4, width * 1.75);
        const baseX = point.x - Math.cos(angle) * length;
        const baseY = point.y - Math.sin(angle) * length;
        const normalX = -Math.sin(angle) * halfWidth;
        const normalY = Math.cos(angle) * halfWidth;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(baseX + normalX, baseY + normalY);
        context.lineTo(baseX - normalX, baseY - normalY);
        context.closePath();
        if (cap === "filledArrow") {
            context.fillStyle = context.strokeStyle;
            context.fill();
        } else context.stroke();
    }
}
