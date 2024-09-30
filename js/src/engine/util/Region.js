class Region {

    constructor(rectangles) {
        if (!Array.isArray(rectangles)) {
            throw new Error("Rectangles must be an array");
        }
        this.rectangles = rectangles;
    }

    getRectangles() {
        return this.rectangles;
    }

    clone() {
        let rectangles = [];
        for (let rectangle of this.rectangles) {
            rectangles.push(rectangle.clone());
        }
        return new Region(rectangles);
    }

}