class MagicWandTool extends Tool {
    constructor(type) {
        super(type);
        this.pending = false;
        this.tracking = false;
        this.origin = null;
        this.dragStart = null;
        this.originStart = null;
        this.baseSelectionData = null;
        this.baseSelectionStencil = null;
        this.combineModeOverride = null;
        this.floodModeOverride = null;
        this.historyMemento = null;
        this.sampleSnapshot = null;
        this.originNub = null;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("magic_wand_tool_cursor");
        const selectionRenderer = this.getDocumentWorkspace().getSelectionRenderer();
        selectionRenderer.setSelectionTinting(true);
        selectionRenderer.setRenderingQuality(this.getSetting("renderingQuality", "high"));
    }

    onDeactivate() {
        if (this.pending) this.commitPending();
        this.destroyNub();
        this.getDocumentWorkspace().getSelectionRenderer().setSelectionTinting(false);
        super.onDeactivate();
    }

    onMouseDown(x, y, button) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) return false;
        const point = new Point(x, y);
        if (this.pending && this.originNub !== null && this.originNub.isPointTouching(point, true)) {
            this.tracking = true;
            this.dragStart = point;
            this.originStart = this.origin.clone();
            this.app.setCursorImg("hand_closed_cursor");
            return true;
        }
        if (this.pending) this.commitPending();
        const sampleSurface = this.getSetting("sampleMode", "layer") === "image"
            ? this.getDocumentWorkspace().getCompositionSurface()
            : this.getActiveLayer().getSurface();
        if (!sampleSurface.getBounds().contains(point)) return false;
        this.baseSelectionData = this.getSelection().save();
        this.combineModeOverride = this.getCombineModeOverride(button);
        this.floodModeOverride = this.app.isShiftKeyDown() ? "global" : null;
        const combineMode = this.combineModeOverride ?? this.getConfiguredCombineMode();
        this.baseSelectionStencil = combineMode === CombineMode.REPLACE
            ? null
            : MagicWandTool.createSelectionStencil(
                this.getSelection().createPath(), sampleSurface.width, sampleSurface.height);
        this.historyMemento = new SelectionHistoryMemento(
            this.getName(), this.getImage(), this.getDocumentWorkspace());
        this.sampleSnapshot = sampleSurface.clone();
        this.origin = point;
        this.pending = true;
        this.renderPending();
        this.positionNub();
        return true;
    }

    onMouseMove(x, y) {
        if (!this.tracking) return false;
        this.origin = new Point(
            this.originStart.x + x - this.dragStart.x,
            this.originStart.y + y - this.dragStart.y
        );
        this.renderPending();
        this.positionNub();
        return true;
    }

    onMouseUp(x, y) {
        if (!this.tracking) return false;
        this.onMouseMove(x, y);
        this.tracking = false;
        this.app.setCursorImg("magic_wand_tool_cursor");
        return true;
    }

    onKeyPress(key) {
        if (!this.pending) return false;
        if (key === "Enter") return this.commitPending();
        if (key === "Escape") return this.cancelPending();
        return false;
    }

    onSettingChanged(key) {
        if (!this.pending) return;
        if (key === "sampleMode") {
            this.disposeSampleSnapshot();
            const surface = this.getSetting("sampleMode", "layer") === "image"
                ? this.getDocumentWorkspace().getCompositionSurface()
                : this.getActiveLayer().getSurface();
            this.sampleSnapshot = surface.clone();
        }
        this.renderPending();
    }

    renderPending() {
        if (!this.pending || this.sampleSnapshot === null) return false;
        const surface = this.sampleSnapshot;
        const x = Math.floor(this.origin.x);
        const y = Math.floor(this.origin.y);
        const selection = this.getSelection();
        selection.restore(this.baseSelectionData);
        const stencil = new BitVector2D(surface.width, surface.height);
        if (x >= 0 && y >= 0 && x < surface.width && y < surface.height) {
            const image = surface.context.getImageData(0, 0, surface.width, surface.height).data;
            const start = (y * surface.width + x) * 4;
            const target = [image[start], image[start + 1], image[start + 2], image[start + 3]];
            const tolerance = this.getToleranceThreshold();
            const premultiplied = this.getSetting("alphaMode", "premultiplied") === "premultiplied";
            const visited = new Uint8Array(surface.width * surface.height);
            const stack = [x, y];
            const matches = (px, py) => {
                if (px < 0 || py < 0 || px >= surface.width || py >= surface.height) return false;
                const pixel = py * surface.width + px;
                if (visited[pixel]) return false;
                return this.matchesColorTolerance(image, pixel * 4, target, tolerance, premultiplied);
            };
            const floodMode = this.floodModeOverride ?? this.getSetting("floodMode", "contiguous");
            if (floodMode === "global") {
                for (let py = 0; py < surface.height; ++py) {
                    for (let px = 0; px < surface.width; ++px) {
                        if (matches(px, py)) {
                            visited[py * surface.width + px] = 1;
                            stencil.set(px, py, true);
                        }
                    }
                }
            } else {
                while (stack.length > 0) {
                    const seedY = stack.pop();
                    const seedX = stack.pop();
                    if (!matches(seedX, seedY)) continue;
                    let left = seedX;
                    while (matches(left - 1, seedY)) --left;
                    let right = left;
                    while (matches(right, seedY)) {
                        visited[seedY * surface.width + right] = 1;
                        stencil.set(right, seedY, true);
                        if (matches(right, seedY - 1)) stack.push(right, seedY - 1);
                        if (matches(right, seedY + 1)) stack.push(right, seedY + 1);
                        ++right;
                    }
                }
            }
        }

        const combineMode = this.combineModeOverride ?? this.getConfiguredCombineMode();
        if (combineMode !== CombineMode.REPLACE) {
            MagicWandTool.combineStencils(stencil, this.baseSelectionStencil, combineMode);
        }

        // Paint.NET 5 turns the filled BitSurface into a GeometryList before
        // displaying it. Trace the stencil here too so only the true outer
        // contours (including holes and disconnected islands) are rendered.
        const path = GraphicsPath.pathFromStencil(
            stencil,
            new Rectangle(0, 0, surface.width, surface.height)
        );

        // The original combines pixelated selections as bit stencils. Besides
        // being exact, this avoids the polygon clipper's explosive complexity
        // when Ctrl adds many disconnected regions.
        selection.reset();
        selection.setContinuationPath(path, CombineMode.REPLACE);
        selection.commitContinuation();
        return true;
    }

    getCombineModeOverride(button) {
        if (this.app.isControlKeyDown() && button === MouseButton.LEFT) return CombineMode.UNION;
        if (this.app.isAltKeyDown() && button === MouseButton.LEFT) return CombineMode.EXCLUDE;
        if (this.app.isControlKeyDown() && button === MouseButton.RIGHT) return CombineMode.XOR;
        if (this.app.isAltKeyDown() && button === MouseButton.RIGHT) return CombineMode.INTERSECT;
        return null;
    }

    static combineStencils(stencil, baseStencil, combineMode) {
        if (baseStencil === null) return;
        const data = stencil.bitArray;
        const base = baseStencil.bitArray;
        for (let i = 0; i < data.length; ++i) {
            switch (combineMode) {
                case CombineMode.UNION: data[i] |= base[i]; break;
                case CombineMode.EXCLUDE: data[i] = base[i] & (data[i] ^ 1); break;
                case CombineMode.INTERSECT: data[i] &= base[i]; break;
                case CombineMode.XOR: data[i] ^= base[i]; break;
            }
        }
    }

    static createSelectionStencil(path, width, height) {
        const cached = path.getPixelStencil(width, height);
        if (cached !== null) return cached;

        const stencil = new BitVector2D(width, height);
        for (const vertexList of path.getVertexLists()) {
            const vertices = vertexList.getVertices();
            if (vertices.length < 3) continue;
            const scans = Utility.getScans(vertices);
            for (const scan of scans) {
                const y = scan.getY();
                if (y < 0 || y >= height) continue;
                const start = Math.max(0, scan.getX());
                const end = Math.min(width, scan.getX() + scan.getLength());
                const row = y * width;
                for (let x = start; x < end; ++x) {
                    stencil.bitArray[row + x] ^= 1;
                }
            }
        }
        return stencil;
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

    commitPending() {
        if (!this.pending) return false;
        this.pending = false;
        this.tracking = false;
        this.historyStack.pushNewMemento(this.historyMemento);
        this.historyMemento = null;
        this.disposePendingResources();
        this.app.setCursorImg("magic_wand_tool_cursor");
        return true;
    }

    cancelPending() {
        if (!this.pending) return false;
        this.getSelection().restore(this.baseSelectionData);
        this.pending = false;
        this.tracking = false;
        this.historyMemento = null;
        this.disposePendingResources();
        this.app.setCursorImg("magic_wand_tool_cursor");
        return true;
    }

    disposePendingResources() {
        this.destroyNub();
        this.disposeSampleSnapshot();
        if (this.baseSelectionData !== null) this.baseSelectionData.dispose();
        this.baseSelectionData = null;
        this.baseSelectionStencil = null;
        this.combineModeOverride = null;
        this.floodModeOverride = null;
    }

    disposeSampleSnapshot() {
        if (this.sampleSnapshot !== null) this.sampleSnapshot.dispose();
        this.sampleSnapshot = null;
    }

    positionNub() {
        if (this.originNub === null) {
            this.originNub = new MoveNubRenderer(this.getSurfaceBox());
            this.originNub.setShape(MoveNubShape.CIRCLE);
            this.getSurfaceBox().addRenderer(this.originNub);
        }
        this.originNub.setLocation(new Point(Math.floor(this.origin.x) + 0.5, Math.floor(this.origin.y) + 0.5));
        this.originNub.setVisible(true);
    }

    destroyNub() {
        if (this.originNub === null) return;
        this.getSurfaceBox().removeRenderer(this.originNub);
        this.originNub.dispose();
        this.originNub = null;
    }
}
