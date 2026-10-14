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

class Selection {

    constructor() {
        this.data = new Data();
        this.depth = 0;
        this.statistics = null;
        this.clipRectangle = new Rectangle(0, 0, 65535, 65535);

        this.changing = new EventHandler();
        this.changed = new EventHandler();
    }

    performChanging() {
        this.push();
    }

    performChanged() {
        this.pop();
    }

    push() {
        // On changing
        if (this.depth === 0) {
            this.changing.fire(this);
        }
        this.depth++;
    }

    reset() {
        this.push();
        this.data.basePath.dispose();
        this.data.basePath = new GraphicsPath();
        this.data.continuation.dispose();
        this.data.continuation = new GraphicsPath();
        this.data.cumulativeTransform.reset();
        this.data.interimTransform.reset();
        this.pop();
    }

    resetContinuation() {
        this.push();
        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuation.reset();
        this.pop();
    }

    setContinuationPath(path, combineMode) {
        this.push();
        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuationCombineMode = combineMode;
        this.data.continuation.dispose();
        this.data.continuation = path;
        this.pop();
    }

    setContinuationPoints(points, combineMode) {
        this.push();

        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuationCombineMode = combineMode;
        this.data.continuation.reset();
        this.data.continuation.addLines(points);
        this.pop();
    }

    setContinuation(rectangle, combineMode) {
        this.push();
        this.commitInterimTransform();
        this.resetCumulativeTransform();
        this.data.continuationCombineMode = combineMode;
        this.data.continuation.reset();
        this.data.continuation.addRectangle(rectangle);
        this.pop();
    }

    commitContinuation() {
        this.push();
        this.data.continuation.closeAllFigures();
        let newBasePath = this.createPath();
        this.data.basePath.dispose();
        this.data.basePath = newBasePath;
        this.data.continuation.reset();
        this.data.continuationCombineMode = CombineMode.XOR;
        this.pop();
    }

    commitInterimTransform() {
        if (!this.data.interimTransform.isIdentity()) {
            this.push();
            this.data.basePath.transform(this.data.interimTransform);
            this.data.continuation.transform(this.data.interimTransform);
            this.data.cumulativeTransform.multiply(this.data.interimTransform, MatrixOrder.APPEND);
            this.data.interimTransform.reset();
            this.pop();
        }
    }

    resetCumulativeTransform() {
        if (this.data.cumulativeTransform === null) {
            this.data.cumulativeTransform = new Matrix();
        }
        this.data.cumulativeTransform.reset();
    }

    pop() {
        // On changed
        if (this.depth === 0) {
            throw new Error("Cannot pop selection when depth is 0");
        }
        this.depth--;
        if (this.depth === 0) {
            this.statistics = null;
            this.changed.fire(this);
        }
    }

    createPath(applyInterimTransform = true) {
        let returnPath = GraphicsPath.combine(
            this.data.basePath,
            this.data.continuationCombineMode,
            this.data.continuation
        );
        if (applyInterimTransform) {
            returnPath.transform(this.data.interimTransform);
        }
        return returnPath;
    }

    save() {
        return this.data.clone();
    }

    restore(state) {
        this.push();
        this.data.dispose();
        this.data = state.clone();
        this.pop();
    }

    getBounds(applyInterimTransformation = true) {
        let path = this.createPath(applyInterimTransformation);
        return path.getBounds();
    }

    getStatistics(documentBounds) {
        if (this.statistics !== null
            && this.statistics.documentWidth === documentBounds.width
            && this.statistics.documentHeight === documentBounds.height) {
            return this.statistics;
        }

        let path = this.createPath();
        let edges = [];
        for (let list of path.getVertexLists()) {
            let points = list.vertices;
            for (let i = 0; i < points.length; i++) {
                let top = points[i];
                let bottom = points[(i + 1) % points.length];
                if (top.y > bottom.y) {
                    [top, bottom] = [bottom, top];
                }
                let start = Math.ceil(top.y - 0.5);
                let end = Math.ceil(bottom.y - 0.5);
                if (start < end) {
                    let dxdy = (bottom.x - top.x) / (bottom.y - top.y);
                    let x = top.x + (start + 0.5 - top.y) * dxdy;
                    edges.push({start, end, x, dxdy});
                }
            }
        }
        edges.sort((a, b) => a.start - b.start);

        // Port of GeometryList.GeometryListEdgeTable.EnumerateScansImpl (5.1.12).
        // Sample at y + 0.5, include both horizontal pixel-center boundaries,
        // and suppress overlaps between adjacent spans. Bounds are not clipped;
        // DocumentWorkspace.GetBoundsAndArea clips only the area to the document.
        let bounds = null;
        let area = 0;
        let active = [];
        let next = 0;
        let y = edges.length === 0 ? 0 : edges[0].start;
        while (next < edges.length || active.length > 0) {
            active = active.filter(edge => edge.end > y);
            if (active.length === 0 && next < edges.length) {
                y = Math.max(y, edges[next].start);
            }
            while (next < edges.length && edges[next].start <= y) {
                active.push(edges[next++]);
            }
            active.sort((a, b) => a.x - b.x);
            let maxLeft = -Infinity;
            for (let i = 0; i + 1 < active.length; i += 2) {
                let left = Math.max(maxLeft, Math.ceil(active[i].x - 0.5));
                let right = 1 + Math.floor(active[i + 1].x - 0.5);
                if (right <= left) {
                    continue;
                }
                maxLeft = Math.max(maxLeft, right);
                let scan = new Rectangle(left || 0, y || 0, right - left, 1);
                bounds = bounds === null ? scan : Rectangle.union(bounds, scan);
                let clipped = Rectangle.intersect(scan, documentBounds);
                area += clipped.width * clipped.height;
            }
            for (let edge of active) {
                edge.x += edge.dxdy;
            }
            y++;
        }
        if (bounds === null) {
            let geometryBounds = Rectangle.intersect(path.getBounds(), documentBounds);
            bounds = new Rectangle(Math.floor(geometryBounds.x), Math.floor(geometryBounds.y), 0, 0);
        }
        path.dispose();
        this.statistics = {
            bounds, area,
            documentWidth: documentBounds.width,
            documentHeight: documentBounds.height
        };
        return this.statistics;
    }

    isEmpty() {
        return this.data.basePath.isEmpty() && this.data.continuation.isEmpty();
    }

    createRegionRaw() {
        let path = this.createPath();
        return Region.fromPath(path);
    }

    createRegion() {
        if (this.isEmpty()) {
            return Region.fromRectangle(this.clipRectangle);
        } else {
            let region = this.createRegionRaw();
            region.intersectRectangle(this.clipRectangle);
            return region;
        }
    }

    getInterimTransform() {
        return this.data.interimTransform;
    }

    getInterimTransformCopy() {
        if (this.data.interimTransform === null) {
            let m = new Matrix();
            m.reset();
            return m;
        } else {
            return this.data.interimTransform.clone();
        }
    }

    getCumulativeTransformCopy() {
        if (this.data.cumulativeTransform === null) {
            let m = new Matrix();
            m.reset();
            return m;
        } else {
            return this.data.cumulativeTransform.clone();
        }
    }

    setInterimTransform(matrix) {
        this.push();
        this.data.interimTransform.dispose();
        this.data.interimTransform = matrix.clone();
        this.pop();
    }
}
