class GraphicsPath {

    // Initialize the path with an empty array to hold path data
    constructor(vertexLists = []) {
        this.vertexLists = vertexLists;
    }

    isEmpty() {
        return this.vertexLists.length === 0;
    }

    getVertexLists() {
        return this.vertexLists;
    }

    // Apply a transformation matrix to the paths
    transform(matrix) {
        if (!(matrix instanceof Matrix)) {
            throw new Error("Input must be an instance of Matrix");
        }

        for (let vertexList of this.vertexLists) {
            vertexList.vertices = vertexList.vertices.map(point => {
                const transformedX = matrix.elements[0][0] * point.x + matrix.elements[0][1] * point.y + matrix.elements[0][2];
                const transformedY = matrix.elements[1][0] * point.x + matrix.elements[1][1] * point.y + matrix.elements[1][2];
                return new Point(transformedX, transformedY);
            });
        }
    }

    // Add a rectangle to the path
    addRectangle(rectangle) {
        if (!(rectangle instanceof Rectangle)) {
            throw new Error("Input must be an instance of Rectangle");
        }

        const {x, y, width, height} = rectangle;

        let vertexList = new VertexList();
        vertexList.addRectangle(x, y, width, height);
        this.vertexLists.push(vertexList);
    }

    addEllipse(rectangle) {
        if (!(rectangle instanceof Rectangle)) {
            throw new Error("Input must be an instance of Rectangle");
        }

        const {x, y, width, height} = rectangle;

        let vertexList = new VertexList();
        vertexList.addEllipse(x, y, width, height);
        this.vertexLists.push(vertexList);
    }

    flatten(matrix, flatness) {
        if (!(matrix instanceof Matrix)) {
            throw new Error("Input must be an instance of Matrix");
        }

        for (let vertexList of this.vertexLists) {
            let flattenedVertices = [];
            for (let i = 0; i < vertexList.vertices.length - 1; i++) {
                const point1 = vertexList.vertices[i];
                const point2 = vertexList.vertices[i + 1];
                const distance = Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));

                if (distance > flatness) {
                    const segments = Math.ceil(distance / flatness);
                    for (let j = 0; j <= segments; j++) {
                        const t = j / segments;
                        const x = point1.x + t * (point2.x - point1.x);
                        const y = point1.y + t * (point2.y - point1.y);
                        flattenedVertices.push(new Point(x, y));
                    }
                }
            }
            vertexList.vertices = flattenedVertices;
        }
    }

    addLines(points) {
        if (!Array.isArray(points) || points.length === 0) {
            throw new Error("Input must be a non-empty array of points");
        }

        if (points.some(point => !(point instanceof Point))) {
            throw new Error("Input must be an array of Point objects");
        }

        let empty = this.isEmpty();
        let vertices = empty ? new VertexList() : this.vertexLists[0];
        vertices.push(...points);
        if (empty) {
            this.vertexLists.push(vertices);
        }
    }

    getPathPoints() {
        let points = [];
        for (let vertexList of this.vertexLists) {
            points.push(...vertexList.vertices);
        }
        return points;
    }

    // Reset the path to be empty
    reset() {
        this.vertexLists = [];
    }

    // Close all open figures in the path
    closeAllFigures() {
        for (let vertexList of this.vertexLists) {
            vertexList.close();
        }
    }

    closeFigure() {
        if (this.vertexLists.length === 0) {
            throw new Error("No figure to close");
        }

        let currentFigure = this.vertexLists[this.vertexLists.length - 1];
        currentFigure.close();
    }

    // Dispose of the path (clean up resources)
    dispose() {
        this.vertexLists = null;
    }

    // Create a clone of the current path
    clone() {
        const clonedPath = new GraphicsPath();
        clonedPath.vertexLists = this.vertexLists.map(point => point.clone());
        return clonedPath;
    }

    // Get the bounding rectangle of the path
    getBounds() {
        if (this.isEmpty()) {
            return new Rectangle(0, 0, 0, 0); // Empty path
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let vertexList of this.vertexLists) {
            for (let point of vertexList.vertices) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }
        }

        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    static combine(subjectPath, combineMode, clipPath) {
        switch (combineMode) {
            case CombineMode.COMPLEMENT:
                return GraphicsPath.combine(clipPath, CombineMode.EXCLUDE, subjectPath);

            case CombineMode.REPLACE:
                return clipPath.clone();

            case CombineMode.XOR:
            case CombineMode.INTERSECT:
            case CombineMode.UNION:
            case CombineMode.EXCLUDE:
                if (subjectPath.isEmpty() && clipPath.isEmpty()) {
                    return new GraphicsPath(); // Empty path
                } else if (subjectPath.isEmpty()) {
                    switch (combineMode) {
                        case CombineMode.XOR:
                        case CombineMode.UNION:
                            return clipPath.clone();

                        case CombineMode.INTERSECT:
                        case CombineMode.EXCLUDE:
                            return new GraphicsPath();

                        default:
                            throw new Error("Invalid enum argument");
                    }
                } else if (clipPath.isEmpty()) {
                    switch (combineMode) {
                        case CombineMode.EXCLUDE:
                        case CombineMode.XOR:
                        case CombineMode.UNION:
                            return subjectPath.clone();

                        case CombineMode.INTERSECT:
                            return new GraphicsPath();

                        default:
                            throw new Error("Invalid enum argument");
                    }
                } else {
                    return GraphicsPath.clipPath(subjectPath, combineMode, clipPath);
                }

            default:
                throw new Error("Invalid enum argument");
        }
    }

    static clipPath(subjectPath, combineMode, clipPath) {
        const basePoly = Polygon.fromGraphicsPath(subjectPath);
        const clipClone = clipPath.clone();
        clipClone.closeAllFigures();
        const clipPoly = Polygon.fromGraphicsPath(clipClone);
        clipClone.dispose();

        const clippedPoly = Polygon.clip(combineMode, basePoly, clipPoly);

        const returnPath = clippedPoly.toGraphicsPath();
        returnPath.closeAllFigures();
        return returnPath;
    }

    static fromRegion(region) {
        if (!(region instanceof Region)) {
            throw new Error("Input must be an instance of Region");
        }

        const scans = region.getRectangles(); // TODO GetRegionScansReadOnlyInt

        if (scans.length === 1) {
            const path = new GraphicsPath();
            path.addRectangle(scans[0]);
            return path;
        } else {
            const bounds = region.getBounds(); // TODO GetBoundsInt
            const stencil = new BitVector2D(bounds.width, bounds.height);

            for (const rect of scans) {
                const adjustedRect = new Rectangle(
                    rect.x - bounds.x,
                    rect.y - bounds.y,
                    rect.width,
                    rect.height
                );
                stencil.setUnchecked(adjustedRect, true);
            }

            const path = GraphicsPath.pathFromStencil(stencil, new Rectangle(
                0,
                0,
                stencil.width,
                stencil.height
            ));

            let matrix = new Matrix();
            matrix.reset();
            matrix.translate(bounds.x, bounds.y);
            path.transform(matrix);

            return path;
        }
    }

    static pathFromStencil(stencil, bounds) {
        if (!(stencil instanceof BitVector2D)) {
            throw new Error("Input must be an instance of BitVector2D");
        }

        if (stencil.isEmpty()) {
            return new GraphicsPath();
        }

        const ret = new GraphicsPath();
        let start = bounds.getLocation();
        const pts = [];
        let count = 0;

        // Find all islands
        while (true) {
            let startFound = false;

            while (true) {
                if (stencil.get(start.x, start.y)) {
                    startFound = true;
                    break;
                }

                start.x++;

                if (start.x >= bounds.right) {
                    start.y++;
                    start.x = bounds.left;

                    if (start.y >= bounds.bottom) {
                        break;
                    }
                }
            }

            if (!startFound) {
                break;
            }

            pts.length = 0; // Clear points
            let last = new Point(start.x, start.y + 1);
            let curr = new Point(start.x, start.y);
            let next = curr;
            let left = Point.EMPTY;
            let right = Point.EMPTY;

            // Trace island outline
            while (true) {
                left.x = ((curr.x - last.x) + (curr.y - last.y) + 2) / 2 + curr.x - 1;
                left.y = ((curr.y - last.y) - (curr.x - last.x) + 2) / 2 + curr.y - 1;

                right.x = ((curr.x - last.x) - (curr.y - last.y) + 2) / 2 + curr.x - 1;
                right.y = ((curr.y - last.y) + (curr.x - last.x) + 2) / 2 + curr.y - 1;

                if (bounds.contains(left) && stencil.get(left.x, left.y)) {
                    // Go left
                    next.x += curr.y - last.y;
                    next.y -= curr.x - last.x;
                } else if (bounds.contains(right) && stencil.get(right.x, right.y)) {
                    // Go straight
                    next.x += curr.x - last.x;
                    next.y += curr.y - last.y;
                } else {
                    // Turn right
                    next.x -= curr.y - last.y;
                    next.y += curr.x - last.x;
                }

                if (Math.sign(next.x - curr.x) !== Math.sign(curr.x - last.x) ||
                    Math.sign(next.y - curr.y) !== Math.sign(curr.y - last.y)) {
                    pts.push(curr);
                    count++;
                }

                last = curr;
                curr = next;

                if (next.x === start.x && next.y === start.y) {
                    break;
                }
            }

            const points = pts.slice();
            const scans = Utility.getScans(points);

            for (const scan of scans) {
                stencil.invertScanline(scan);
            }

            ret.addLines(points);
            ret.closeFigure();
        }

        return ret;
    }
}