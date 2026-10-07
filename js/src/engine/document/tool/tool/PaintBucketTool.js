class PaintBucketTool extends Tool {
    constructor(type) {
        super(type);
        this.pending = false;
        this.tracking = false;
        this.origin = null;
        this.dragStart = null;
        this.originStart = null;
        this.button = MouseButton.LEFT;
        this.originNub = null;
        this.sampleSnapshot = null;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("paint_bucket_tool_cursor");
    }

    onDeactivate() {
        if (this.pending) this.commitPending();
        this.destroyNub();
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
        const surface = this.getActiveLayer().getSurface();
        if (!surface.getBounds().contains(point)) return false;
        this.beginBitmapTransaction();
        const sampleSurface = this.getSetting("sampleMode", "layer") === "image"
            ? this.getDocumentWorkspace().getCompositionSurface()
            : surface;
        this.sampleSnapshot = sampleSurface.clone();
        this.origin = point;
        this.button = button;
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
        this.app.setCursorImg("paint_bucket_tool_cursor");
        return true;
    }

    onKeyPress(key) {
        if (!this.pending) return false;
        if (key === "Enter") return this.commitPending();
        if (key === "Escape") return this.commitPending();
        return false;
    }

    onSettingChanged(key) {
        if (!this.pending) return;
        if (key === "sampleMode") {
            const bounds = this.bitmapTransaction.dirtyBounds;
            if (bounds !== null && !bounds.isEmpty()) {
                this.getActiveLayer().getSurface().copyRegionFrom(this.scratchSurface, bounds);
                this.getActiveLayer().invalidate(bounds);
            }
            this.disposeSampleSnapshot();
            const sampleSurface = this.getSetting("sampleMode", "layer") === "image"
                ? this.getDocumentWorkspace().getCompositionSurface()
                : this.scratchSurface;
            this.sampleSnapshot = sampleSurface.clone();
            this.bitmapTransaction.dirtyBounds = null;
        }
        this.renderPending();
    }

    renderPending() {
        if (!this.pending || this.bitmapTransaction === null) return false;
        const surface = this.getActiveLayer().getSurface();
        const width = surface.width;
        const height = surface.height;
        const x = Math.floor(this.origin.x);
        const y = Math.floor(this.origin.y);
        const previousBounds = this.bitmapTransaction.dirtyBounds === null
            ? null : this.bitmapTransaction.dirtyBounds.clone();

        if (x < 0 || y < 0 || x >= width || y >= height) {
            if (previousBounds !== null) {
                surface.copyRegionFrom(this.scratchSurface, previousBounds);
                this.getActiveLayer().invalidate(previousBounds);
            }
            this.bitmapTransaction.dirtyBounds = null;
            return true;
        }

        const baseImage = this.scratchSurface.context.getImageData(0, 0, width, height);
        const data = baseImage.data;
        const sampleData = this.sampleSnapshot.context.getImageData(0, 0, width, height).data;
        const start = (y * width + x) * 4;
        const target = [sampleData[start], sampleData[start + 1], sampleData[start + 2], sampleData[start + 3]];
        const color = this.getColor(this.button);
        const backgroundColor = this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT);
        const tolerance = this.getToleranceThreshold();
        const floodMode = this.app.isShiftKeyDown() ? "global" : this.getSetting("floodMode", "contiguous");
        const premultiplied = this.getSetting("alphaMode", "premultiplied") === "premultiplied";
        const selectionPath = this.createSelectionPath();
        const visited = new Uint8Array(width * height);
        const stack = [x, y];
        let minX = width, minY = height, maxX = -1, maxY = -1;
        const matches = (px, py) => {
            if (px < 0 || py < 0 || px >= width || py >= height) return false;
            const pixel = py * width + px;
            if (visited[pixel]) return false;
            if (selectionPath !== null
                && !surface.context.isPointInPath(selectionPath, px + 0.5, py + 0.5, "evenodd")) return false;
            return this.matchesColorTolerance(sampleData, pixel * 4, target, tolerance, premultiplied);
        };
        const paint = (px, py) => {
            const pixel = py * width + px;
            visited[pixel] = 1;
            const i = pixel * 4;
            const replacement = this.getFillColorAt(px, py, color, backgroundColor);
            this.blendPixel(data, i, replacement);
            minX = Math.min(minX, px); minY = Math.min(minY, py);
            maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
        };

        if (floodMode === "global") {
            for (let py = 0; py < height; ++py) {
                for (let px = 0; px < width; ++px) {
                    if (matches(px, py)) paint(px, py);
                    else visited[py * width + px] = 1;
                }
            }
        } else {
            while (stack.length > 0) {
                const seedY = stack.pop();
                const seedX = stack.pop();
                if (!matches(seedX, seedY)) continue;
                let left = seedX;
                while (matches(left - 1, seedY)) --left;
                let spanUp = false, spanDown = false;
                for (let px = left; matches(px, seedY); ++px) {
                    paint(px, seedY);
                    if (matches(px, seedY - 1)) {
                        if (!spanUp) stack.push(px, seedY - 1);
                        spanUp = true;
                    } else spanUp = false;
                    if (matches(px, seedY + 1)) {
                        if (!spanDown) stack.push(px, seedY + 1);
                        spanDown = true;
                    } else spanDown = false;
                }
            }
        }

        const nextBounds = maxX < minX
            ? new Rectangle(x, y, 0, 0)
            : Rectangle.absolute(minX, minY, maxX + 1, maxY + 1);
        let dirtyBounds = previousBounds === null
            ? nextBounds : Rectangle.union(previousBounds, nextBounds);
        dirtyBounds.intersect(surface.getBounds());
        if (!dirtyBounds.isEmpty()) {
            surface.copyRegionFrom(this.scratchSurface, dirtyBounds);
            if (!nextBounds.isEmpty()) {
                surface.context.putImageData(baseImage, 0, 0,
                    nextBounds.x, nextBounds.y, nextBounds.width, nextBounds.height);
            }
            this.getActiveLayer().invalidate(dirtyBounds);
        }
        this.bitmapTransaction.dirtyBounds = nextBounds;
        return true;
    }

    commitPending() {
        if (!this.pending) return false;
        this.pending = false;
        this.tracking = false;
        this.destroyNub();
        this.disposeSampleSnapshot();
        this.commitBitmapTransaction();
        this.app.setCursorImg("paint_bucket_tool_cursor");
        return true;
    }

    cancelPending() {
        if (!this.pending) return false;
        this.pending = false;
        this.tracking = false;
        this.destroyNub();
        this.disposeSampleSnapshot();
        this.cancelBitmapTransaction();
        this.app.setCursorImg("paint_bucket_tool_cursor");
        return true;
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

    createSelectionPath() {
        if (this.getSelection().isEmpty()) return null;
        const selection = this.getSelection().createPath();
        const result = new Path2D();
        for (const list of selection.getVertexLists()) {
            const points = list.getVertices();
            if (points.length === 0) continue;
            result.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; ++i) result.lineTo(points[i].x, points[i].y);
            result.closePath();
        }
        selection.dispose();
        return result;
    }
}
