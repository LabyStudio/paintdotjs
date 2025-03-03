class VertexList {

    constructor(vertices = [], hole = false) {
        this.vertices = [];
        this.hole = hole;

        if (vertices.length > 0) {
            this.push(...vertices);
        }
    }

    addRectangle(x, y, width, height) {
        this.push(
            new Point(x, y), // Top-left
            new Point(x + width, y), // Top-right
            new Point(x + width, y + height), // Bottom-right
            new Point(x, y + height), // Bottom-left
            new Point(x, y), // Close the rectangle (return to start)
        )
    }

    push(...points) {
        for (let point of points) {
            if (!(point instanceof Point)) {
                throw new Error("Input must be an array of Point objects");
            }
        }
        this.vertices.push(...points);
    }

    close() {
        if (this.vertices.length > 1) {
            const firstPoint = this.vertices[0];
            const lastPoint = this.vertices[this.vertices.length - 1];

            if (!firstPoint.equals(lastPoint)) {
                this.vertices.push(firstPoint);
            }
        }
    }

    isHole() {
        return this.hole;
    }

    clone() {
        return new VertexList(this.vertices.map(point => point.clone()), this.hole);
    }

    getVertices() {
        return this.vertices;
    }

}