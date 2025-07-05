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

    invert(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error("Coordinates out of bounds");
        }
        this.set(x, y, !this.get(x, y));
    }

    setUnchecked(rectangle, value) {
        if (!(rectangle instanceof Rectangle)) {
            throw new Error("Input must be an instance of Rectangle");
        }

        for (let y = rectangle.getTop(); y < rectangle.getBottom(); ++y) {
            for (let x = rectangle.getLeft(); x < rectangle.getRight(); ++x) {
                this.set(x, y, value);
            }
        }
    }

    invertScanline(scanline) {
        if (!(scanline instanceof Scanline)) {
            throw new Error("Input must be an instance of Scanline");
        }

        let x = scanline.getX();
        const endX = x + scanline.getLength();
        const y = scanline.getY();

        while (x < endX) {
            this.invert(x, y);
            ++x;
        }
    }
}