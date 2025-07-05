class Point {

    static EMPTY = new Point(0, 0);

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    equals(point) {
        return this.x === point.x && this.y === point.y;
    }

    clone() {
        return new Point(this.x, this.y);
    }

}