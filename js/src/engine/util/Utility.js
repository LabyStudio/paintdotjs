class Utility {

    static LEFT = 0;
    static RIGHT = 1;
    static TOP = 2;
    static BOTTOM = 3;

    static identityMatrix = new Matrix();

    static {
        Utility.identityMatrix.reset();
    }

    static sutherlandHodgman(bounds, v) {
        let p1 = Utility.sutherlandHodgmanOneAxis(bounds, Utility.LEFT, v);
        let p2 = Utility.sutherlandHodgmanOneAxis(bounds, Utility.RIGHT, p1);
        let p3 = Utility.sutherlandHodgmanOneAxis(bounds, Utility.TOP, p2);
        let p4 = Utility.sutherlandHodgmanOneAxis(bounds, Utility.BOTTOM, p3);

        return p4;
    }

    static sutherlandHodgmanOneAxis(bounds, edge, v) {
        if (v.length === 0) {
            return [];
        }

        let polygon = [];
        let s = v[v.length - 1];

        for (let i = 0; i < v.length; i++) {
            let p = v[i];

            let pIn = Utility.isInside(bounds, edge, p);
            let sIn = Utility.isInside(bounds, edge, s);

            if (sIn && pIn) {
                polygon.push(p);
            } else if (sIn && !pIn) {
                polygon.push(Utility.lineIntercept(bounds, edge, s, p));
            } else if (!sIn && !pIn) {
                // Do nothing
            } else if (!sIn && pIn) {
                polygon.push(Utility.lineIntercept(bounds, edge, s, p));
                polygon.push(p);
            }

            s = p;
        }

        return polygon;
    }

    static isInside(bounds, edge, p) {
        switch (edge) {
            case Utility.LEFT:
                return !(p.x < bounds.getLeft());
            case Utility.RIGHT:
                return !(p.x > bounds.getRight());
            case Utility.TOP:
                return !(p.y < bounds.getTop());
            case Utility.BOTTOM:
                return !(p.y > bounds.getBottom());
        }
    }

    static lineIntercept(bounds, edge, a, b) {
        if (a === b) {
            return a;
        }

        switch (edge) {
            case Utility.BOTTOM:
                if (b.y === a.y) {
                    throw new Error("No intercept found");
                }
                return new Point(a.x + (((b.x - a.x) * (bounds.getBottom() - a.y)) / (b.y - a.y)), bounds.getBottom());
            case Utility.LEFT:
                if (b.x === a.x) {
                    throw new Error("No intercept found");
                }
                return new Point(bounds.getLeft(), a.y + (((b.y - a.y) * (bounds.getLeft() - a.x)) / (b.x - a.x)));
            case Utility.RIGHT:
                if (b.x === a.x) {
                    throw new Error("No intercept found");
                }
                return new Point(bounds.getRight(), a.y + (((b.y - a.y) * (bounds.getRight() - a.x)) / (b.x - a.x)));
            case Utility.TOP:
                if (b.y === a.y) {
                    throw new Error("No intercept found");
                }
                return new Point(a.x + (((b.x - a.x) * (bounds.getTop() - a.y)) / (b.y - a.y)), bounds.getTop());
            default:
                throw new Error("Unknown edge");
        }
    }

    static pointsToConstrainedRectangle(a, b) {
        let rect = Utility.pointsToRectangle(a, b);
        let minWH = Math.min(rect.width, rect.height);

        rect.width = minWH;
        rect.height = minWH;

        if (rect.getY() !== a.getY()) {
            rect.setY(a.getY() - minWH);
        }

        if (rect.getX() !== a.getX()) {
            rect.setX(a.getX() - minWH);
        }

        return rect;
    }

    static pointsToRectangle(a, b) {
        let x = Math.min(a.x, b.x);
        let y = Math.min(a.y, b.y);
        let width = Math.abs(a.x - b.x) + 1;
        let height = Math.abs(a.y - b.y) + 1;

        return new Rectangle(x, y, width, height);
    }

    static rectangleFromCenter(center, halfSize) {
        let ret = new Rectangle(center.x, center.y, 0, 0);
        ret.inflate(halfSize, halfSize);
        return ret;
    }

    static roundRectangle(rect) {
        let left = Math.floor(rect.getLeft());
        let top = Math.floor(rect.getTop());
        let right = Math.ceil(rect.getRight());
        let bottom = Math.ceil(rect.getBottom());

        return Rectangle.truncate(Rectangle.absolute(left, top, right, bottom));
    }
}