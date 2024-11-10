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
            const [x, y] = point;
            const transformedX = matrix.values[0][0] * x + matrix.values[0][1] * y + matrix.values[0][2];
            const transformedY = matrix.values[1][0] * x + matrix.values[1][1] * y + matrix.values[1][2];
            return [transformedX, transformedY];
        });
    }

    // Add a rectangle to the path
    addRectangle(rectangle) {
        if (!(rectangle instanceof Rectangle)) {
            throw new Error("Input must be an instance of Rectangle");
        }

        const {x, y, width, height} = rectangle;

        this.pathData.push([x, y]); // Top-left
        this.pathData.push([x + width, y]); // Top-right
        this.pathData.push([x + width, y + height]); // Bottom-right
        this.pathData.push([x, y + height]); // Bottom-left
        this.pathData.push([x, y]); // Close the rectangle (return to start)
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

            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                this.pathData.push([...firstPoint]); // Close the figure
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
        clonedPath.pathData = this.pathData.map(point => [...point]);
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

        this.pathData.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });

        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    // Combine two paths using a specified combination mode
    static combine(subjectPath, combineMode, clipPath) {
        if (!(subjectPath instanceof GraphicsPath) || !(clipPath instanceof GraphicsPath)) {
            throw new Error("Both paths must be instances of GraphicsPath");
        }

        const combinedPath = new GraphicsPath();

        // Simplified combination logic
        switch (combineMode) {
            case CombineMode.UNION:
                combinedPath.pathData = [...subjectPath.pathData, ...clipPath.pathData];
                break;
            case CombineMode.INTERSECT:
                // Keep only the overlapping parts of subjectPath and clipPath
                combinedPath.pathData = subjectPath.pathData.filter((point) =>
                    clipPath.pathData.some(
                        (clipPoint) =>
                            clipPoint.x === point.x &&
                            clipPoint.y === point.y
                    )
                );
                break;
            case CombineMode.XOR:
                // Keep non-overlapping points from both paths
                const subjectOnly = subjectPath.pathData.filter((point) =>
                    !clipPath.pathData.some(
                        (clipPoint) =>
                            clipPoint.x === point.x &&
                            clipPoint.y === point.y
                    )
                );

                const clipOnly = clipPath.pathData.filter((clipPoint) =>
                    !subjectPath.pathData.some(
                        (point) =>
                            clipPoint.x === point.x &&
                            clipPoint.y === point.y
                    )
                );

                combinedPath.pathData = [...subjectOnly, ...clipOnly];
                break;
            case CombineMode.EXCLUDE:
                // In a real implementation, calculate the subtraction of paths
                combinedPath.pathData = subjectPath.pathData; // Placeholder for exclusion logic
                break;
            case CombineMode.REPLACE:
                combinedPath.pathData = [...clipPath.pathData];
                break;
            default:
                throw new Error("Invalid combine mode");
        }

        return combinedPath;
    }
}