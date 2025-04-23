class Region {

    constructor(rectangles) {
        if (!Array.isArray(rectangles)) {
            throw new Error("Rectangles must be an array");
        }
        this.rectangles = rectangles;
    }

    intersectRectangle(rectangle) {
        let newRectangles = [];

        for (let rect of this.rectangles) {
            // Clone the rectangle to avoid modifying the original
            let clone = rect.clone();
            clone.intersect(rectangle);

            // Only keep non-empty intersections
            if (clone.width > 0 && clone.height > 0) {
                newRectangles.push(clone);
            }
        }

        // Update the region with only the intersecting parts
        this.rectangles = newRectangles;
    }

    getRectangles() {
        return this.rectangles;
    }

    getBounds() {
        let rects = this.getRectangles();
        let bounds = rects[0];
        for (let i = 1; i < rects.length; ++i) {
            bounds = Rectangle.union(bounds, rects[i]);
        }
        return bounds;
    }

    clone() {
        let rectangles = [];
        for (let rectangle of this.rectangles) {
            rectangles.push(rectangle.clone());
        }
        return Region.fromRectangles(rectangles);
    }

    size() {
        return this.rectangles.length;
    }

    dispose() {
        for (let rectangle of this.rectangles) {
            rectangle.dispose();
        }
        this.rectangles = [];
    }

    static fromPath(path) {
        if (!(path instanceof GraphicsPath)) {
            throw new Error("Input must be a GraphicsPath");
        }

        let rectangles = [];
        for (let vertexList of path.getVertexLists()) {
            let rect = vertexList.getBounds();
            if (rect !== null) {
                rectangles.push(rect);
            }
        }
        return Region.fromRectangles(rectangles);
    }

    static fromRectangle(rectangle) {
        return Region.fromRectangles([rectangle]);
    }

    static fromRectangles(rectangles) {
        return new Region(rectangles);
    }

}