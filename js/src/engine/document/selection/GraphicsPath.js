class GraphicsPath {
    constructor() {
        // Initialize the path with an empty array to hold path data
        this.pathData = [];
    }

    isEmpty() {
        return this.pathData.length === 0;
    }

    // Apply a transformation matrix to the path
    transform(matrix) {
        if (!(matrix instanceof Matrix)) {
            throw new Error("Input must be an instance of Matrix");
        }

        this.pathData = this.pathData.map(point => {
            const transformedX = matrix.values[0][0] * point.x + matrix.values[0][1] * point.y + matrix.values[0][2];
            const transformedY = matrix.values[1][0] * point.x + matrix.values[1][1] * point.y + matrix.values[1][2];
            return new Point(transformedX, transformedY);
        });
    }

    // Add a rectangle to the path
    addRectangle(rectangle) {
        if (!(rectangle instanceof Rectangle)) {
            throw new Error("Input must be an instance of Rectangle");
        }

        const {x, y, width, height} = rectangle;

        this.pathData.push(new Point(x, y)); // Top-left
        this.pathData.push(new Point(x + width, y)); // Top-right
        this.pathData.push(new Point(x + width, y + height)); // Bottom-right
        this.pathData.push(new Point(x, y + height)); // Bottom-left
        this.pathData.push(new Point(x, y)); // Close the rectangle (return to start)
    }

    addLines(points) {
        if (!Array.isArray(points) || points.length === 0) {
            throw new Error("Input must be a non-empty array of points");
        }

        if (points.some(point => !(point instanceof Point))) {
            throw new Error("Input must be an array of Point objects");
        }

        this.pathData.push(...points);
    }

    // Reset the path to be empty
    reset() {
        this.pathData = [];
    }

    // Close all open figures in the path
    closeAllFigures() {
        if (this.pathData.length > 1) {
            const firstPoint = this.pathData[0];
            const lastPoint = this.pathData[this.pathData.length - 1];

            if (!firstPoint.equals(lastPoint)) {
                this.pathData.push(firstPoint);
            }
        }
    }

    // Dispose of the path (clean up resources)
    dispose() {
        this.pathData = null;
    }

    // Create a clone of the current path
    clone() {
        const clonedPath = new GraphicsPath();
        clonedPath.pathData = this.pathData.map(point => point.clone());
        return clonedPath;
    }

    // Get the bounding rectangle of the path
    getBounds() {
        if (this.pathData.length === 0) {
            return new Rectangle(0, 0, 0, 0); // Empty path
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.pathData.forEach(point => {
            if (point.x < minX) minX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.x > maxX) maxX = point.x;
            if (point.y > maxY) maxY = point.y;
        });

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
                    const resultPath = GraphicsPath.clipPath(subjectPath, combineMode, clipPath);
                    return new GraphicsPath(resultPath);
                }

            default:
                throw new Error("Invalid enum argument");
        }
    }

    static clipPath(subjectPath, combineMode, clipPath) {
        throw new Error("clipPath is not implemented");
    }
}