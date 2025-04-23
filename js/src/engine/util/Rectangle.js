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

    contains(point) {
        return point.x >= this.x
            && point.x <= this.x + this.width
            && point.y >= this.y
            && point.y <= this.y + this.height;
    }

    intersect(rect) {
        let x1 = Math.max(this.x, rect.x);
        let x2 = Math.min(this.x + this.width, rect.x + rect.width);
        let y1 = Math.max(this.y, rect.y);
        let y2 = Math.min(this.y + this.height, rect.y + rect.height);
        this.x = x1;
        this.y = y1;
        this.width = Math.max(0, x2 - x1);
        this.height = Math.max(0, y2 - y1);
    }

    inflate(x, y) {
        this.x -= x;
        this.y -= y;
        this.width += 2 * x;
        this.height += 2 * y;
    }

    scale(scaleX, scaleY) {
        let centerX = this.x + this.width / 2;
        let centerY = this.y + this.height / 2;

        this.width *= scaleX;
        this.height *= scaleY;

        this.x = centerX - this.width / 2
        this.y = centerY - this.height / 2;
    }

    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    isEmpty() {
        return this.width <= 0 || this.height <= 0;
    }

    toString() {
        return this.x + ", " + this.y + " (" + this.width + "x" + this.height + ")";
    }

    dispose() {
        // Dispose logic if needed
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

    static truncate(rectangle) {
        return new Rectangle(
            Math.trunc(rectangle.x),
            Math.trunc(rectangle.y),
            Math.trunc(rectangle.width),
            Math.trunc(rectangle.height)
        );
    }

    static union(rectangle1, rectangle2) {
        let x1 = Math.min(rectangle1.x, rectangle2.x);
        let y1 = Math.min(rectangle1.y, rectangle2.y);
        let x2 = Math.max(rectangle1.x + rectangle1.width, rectangle2.x + rectangle2.width);
        let y2 = Math.max(rectangle1.y + rectangle1.height, rectangle2.y + rectangle2.height);
        return new Rectangle(x1, y1, x2 - x1, y2 - y1);
    }

    static empty() {
        return new Rectangle();
    }
}