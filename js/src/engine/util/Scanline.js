class Scanline {
    constructor(x, y, length) {
        this.x = x;
        this.y = y;
        this.length = length;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    getLength() {
        return this.length;
    }

    equals(other) {
        return other instanceof Scanline &&
            this.x === other.x &&
            this.y === other.y &&
            this.length === other.length;
    }

    toString() {
        return `(${this.x},${this.y}):[${this.length}]`;
    }
}