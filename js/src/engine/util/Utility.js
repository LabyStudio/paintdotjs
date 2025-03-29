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

    static getAngleOfTransform(matrix) {
        let pts = [new Point(1.0, 0.0)];
        matrix.transformVectors(pts);
        let atan2 = Math.atan2(pts[0].y, pts[0].x);
        return atan2 * (180.0 / Math.PI);
    }

    static isTransformFlipped(matrix) {
        let ptX = new Point(1.0, 0.0);
        let ptXT = Utility.transformOneVector(matrix, ptX);
        let atan2X = Math.atan2(ptXT.y, ptXT.x);
        let angleX = atan2X * (180.0 / Math.PI);

        let ptY = new Point(0.0, 1.0);
        let ptYT = Utility.transformOneVector(matrix, ptY);
        let atan2Y = Math.atan2(ptYT.y, ptYT.x);
        let angleY = (atan2Y * (180.0 / Math.PI)) - 90.0;

        while (angleX < 0) {
            angleX += 360;
        }

        while (angleY < 0) {
            angleY += 360;
        }

        let angleDelta = Math.abs(angleX - angleY);

        return angleDelta > 1.0 && angleDelta < 359.0;
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

    static transformOnePoint(matrix, point) {
        let ptFs = [point];
        matrix.transformPoints(ptFs);
        return ptFs[0];
    }

    static transformOneVector(matrix, vector) {
        let vecs = [vector];
        matrix.transformVectors(vecs);
        return vecs[0];
    }

    static roundRectangle(rect) {
        let left = Math.floor(rect.getLeft());
        let top = Math.floor(rect.getTop());
        let right = Math.ceil(rect.getRight());
        let bottom = Math.ceil(rect.getBottom());

        return Rectangle.truncate(Rectangle.absolute(left, top, right, bottom));
    }

    static normalizeVector2(vec) {
        let magnitude = Utility.magnitude(vec);

        if (magnitude === 0) {
            return new Point(0, 0);
        } else {
            return new Point(vec.x / magnitude, vec.y / magnitude);
        }
    }

    static getProjection(pointY, pointU) {
        if (pointU.x === 0 && pointU.y === 0) {
            return {
                yhat: new Point(0, 0),
                yhatLen: 0,
                z: new Point(0, 0)
            };
        } else {
            let yDotU = Utility.dotProduct(pointY, pointU);
            let uDotU = Utility.dotProduct(pointU, pointU);
            let yhatLen = yDotU / uDotU;
            let yhat = Utility.multiplyVector(pointU, yhatLen);
            let z = Utility.subtractVectors(pointY, yhat);

            return {
                yhat: yhat,
                yhatLen: yhatLen,
                z: z
            };
        }
    }

    static dotProduct(point1, point2) {
        return point1.x * point2.x + point1.y * point2.y;
    }

    static multiplyVector(point, scalar) {
        return new Point(point.x * scalar, point.y * scalar);
    }

    static subtractVectors(point1, point2) {
        return new Point(point1.x - point2.x, point1.y - point2.y);
    }

    static distance(point1, point2) {
        return Utility.magnitude(new Point(point1.x - point2.x, point1.y - point2.y));
    }

    static magnitude(point) {
        return Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}