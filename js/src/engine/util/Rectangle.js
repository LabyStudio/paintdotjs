class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getLeft() {
        return this.x;
    }

    getTop() {
        return this.y;
    }

    getRight() {
        return this.x + this.width;
    }

    static relative(x, y, width, height) {
        return new Rectangle(x, y, width, height);
    }

    static absolute(left, top, right, bottom) {
        return new Rectangle(left, top, right - left, bottom - top);
    }
}