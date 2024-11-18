class Size {

    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    equals(size) {
        return this.width === size.width && this.height === size.height;
    }

}