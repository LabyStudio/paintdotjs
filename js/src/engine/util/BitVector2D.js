class BitVector2D {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.bitArray = new Array(width * height).fill(false);
    }

    clear(value) {
        this.bitArray.fill(value);
    }

    set(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error("Coordinates out of bounds");
        }
        this.bitArray[y * this.width + x] = value;
    }

    get(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error("Coordinates out of bounds");
        }
        return this.bitArray[y * this.width + x];
    }
}