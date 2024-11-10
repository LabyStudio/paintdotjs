class Rectangle {

    constructor(x = 0, y = 0, width = 0, height = 0) {
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

    getBottom() {
        return this.y + this.height;
    }

    setRight(right) {
        this.width = right - this.x;
    }

    setBottom(bottom) {
        this.height = bottom - this.y;
    }

    setLeft(left) {
        this.width += this.x - left;
        this.x = left;
    }

    setTop(top) {
        this.height += this.y - top;
        this.y = top;
    }

    setWidth(width) {
        this.width = width;
    }

    setHeight(height) {
        this.height = height;
    }

    setX(x) {
        this.x = x;
    }

    setY(y) {
        this.y = y;
    }

    setRelative(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    setAbsolute(left, top, right, bottom) {
        this.x = left;
        this.y = top;
        this.width = right - left;
        this.height = bottom - top;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    toString() {
        return this.x + ", " + this.y + " (" + this.width + "x" + this.height + ")";
    }

    static relative(x, y, width, height) {
        return new Rectangle(x, y, width, height);
    }

    static absolute(left, top, right, bottom) {
        return new Rectangle(left, top, right - left, bottom - top);
    }

    static fromElement(element) {
        let rect = element.getBoundingClientRect();
        return new Rectangle(rect.left, rect.top, rect.width, rect.height);
    }
}