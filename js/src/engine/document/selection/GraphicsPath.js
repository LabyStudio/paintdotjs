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
                const transformedX = matrix.values[0][0] * point.x + matrix.values[0][1] * point.y + matrix.values[0][2];
                const transformedY = matrix.values[1][0] * point.x + matrix.values[1][1] * point.y + matrix.values[1][2];
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
}