class Utility {

    static LEFT = 0;
    static RIGHT = 1;
    static TOP = 2;
    static BOTTOM = 3;

    static identityMatrix = new Matrix();

    static defaultSimplificationFactor = 50;

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

    static simplifyAndInflateRegion(
        region,
        complexity = Utility.defaultSimplificationFactor,
        inflationAmount = 1
    ) {
        let simplified = Utility.simplifyRegion(region, complexity);

        for (let i = 0; i < simplified.length; ++i) {
            simplified[i].inflate(inflationAmount, inflationAmount);
        }

        return simplified;
    }

    static simplifyRegion(region, complexity) {
        if (complexity === 0 || region.size() < complexity) {
            return region.clone();
        }

        let boxes = new Array(complexity);

        for (let i = 0; i < complexity; ++i) {
            let startIndex = Math.floor((i * region.size()) / complexity);
            let length = Math.min(region.size(), Math.floor(((i + 1) * region.size()) / complexity)) - startIndex;
            boxes[i] = Utility.getRegionBounds(region, startIndex, length);
        }

        return boxes;
    }

    static splitRectangle(rect, rects) {
        let height = rect.height;

        for (let i = 0; i < rects.length; ++i) {
            rects[i] = new Rectangle(
                rect.getLeft(),
                rect.getTop() + ((height * i) / rects.length),
                rect.getRight() - rect.getLeft(),
                (height * (i + 1)) / rects.length - (height * i) / rects.length
            );
        }
    }

    static getScans(vertices, startIndex = 0, length = vertices.length) {
        if (length > vertices.length - startIndex) {
            throw new Error("out of bounds: length > vertices.length - startIndex");
        }

        let ymax = 0;

        // Build edge table
        let edgeTable = new Array(length);
        let edgeCount = 0;

        for (let i = startIndex; i < startIndex + length; ++i) {
            let top = vertices[i];
            let bottom = vertices[((i + 1 - startIndex) % length) + startIndex];
            let dy;

            if (top.y > bottom.y) {
                [top, bottom] = [bottom, top];
            }

            dy = bottom.y - top.y;

            if (dy !== 0) {
                edgeTable[edgeCount] = new UtilityEdge(top.y, bottom.y, top.x << 8, ((bottom.x - top.x) << 8) / dy);
                ymax = Math.max(ymax, bottom.y);
                ++edgeCount;
            }
        }

        // Sort edge table by miny
        for (let i = 0; i < edgeCount - 1; ++i) {
            let min = i;

            for (let j = i + 1; j < edgeCount; ++j) {
                if (edgeTable[j].miny < edgeTable[min].miny) {
                    min = j;
                }
            }

            if (min !== i) {
                [edgeTable[min], edgeTable[i]] = [edgeTable[i], edgeTable[min]];
            }
        }

        // Compute how many scanlines we will be emitting
        let scanCount = 0;
        let activeLow = 0;
        let activeHigh = 0;
        let yscan1 = edgeTable[0].miny;

        // we assume that edgeTable[0].miny == yscan
        while (activeHigh < edgeCount - 1 && edgeTable[activeHigh + 1].miny === yscan1) {
            ++activeHigh;
        }

        while (yscan1 <= ymax) {
            // Find new edges where yscan == miny
            while (activeHigh < edgeCount - 1 && edgeTable[activeHigh + 1].miny === yscan1) {
                ++activeHigh;
            }

            let count = 0;
            for (let i = activeLow; i <= activeHigh; ++i) {
                if (edgeTable[i].maxy > yscan1) {
                    ++count;
                }
            }

            scanCount += Math.floor(count / 2);
            ++yscan1;

            // Remove edges where yscan == maxy
            while (activeLow < edgeCount - 1 && edgeTable[activeLow].maxy <= yscan1) {
                ++activeLow;
            }

            if (activeLow > activeHigh) {
                activeHigh = activeLow;
            }
        }

        // Allocate scanlines that we'll return
        let scans = new Array(scanCount);

        // Active Edge Table (AET): it is indices into the Edge Table (ET)
        let active = new Array(edgeCount);
        let activeCount = 0;
        let yscan2 = edgeTable[0].miny;
        let scansIndex = 0;

        // Repeat until both the ET and AET are empty
        while (yscan2 <= ymax) {
            // Move any edges from the ET to the AET where yscan == miny
            for (let i = 0; i < edgeCount; ++i) {
                if (edgeTable[i].miny === yscan2) {
                    active[activeCount] = i;
                    ++activeCount;
                }
            }

            // Sort the AET on x
            for (let i = 0; i < activeCount - 1; ++i) {
                let min = i;

                for (let j = i + 1; j < activeCount; ++j) {
                    if (edgeTable[active[j]].x < edgeTable[active[min]].x) {
                        min = j;
                    }
                }

                if (min !== i) {
                    [active[min], active[i]] = [active[i], active[min]];
                }
            }

            // For each pair of entries in the AET, fill in pixels between their info
            for (let i = 0; i < activeCount; i += 2) {
                let el = edgeTable[active[i]];
                let er = edgeTable[active[i + 1]];
                let startx = (el.x + 0xff) >> 8; // ceil(x)
                let endx = er.x >> 8;      // floor(x)

                scans[scansIndex] = new Scanline(startx, yscan2, endx - startx);
                ++scansIndex;
            }

            ++yscan2;

            // Remove from the AET any edge where yscan == maxy
            let k = 0;
            while (k < activeCount && activeCount > 0) {
                if (edgeTable[active[k]].maxy === yscan2) {
                    // remove by shifting everything down one
                    for (let j = k + 1; j < activeCount; ++j) {
                        active[j - 1] = active[j];
                    }

                    --activeCount;
                } else {
                    ++k;
                }
            }

            // Update x for each entry in AET
            for (let i = 0; i < activeCount; ++i) {
                edgeTable[active[i]].x += edgeTable[active[i]].dxdy;
            }
        }

        return scans;
    }

    static getRegionBounds(region, startIndex, length) {
        if (region.size() === 0) {
            return new Rectangle();
        }

        let rects = region.getRectangles();
        let left = rects[startIndex].getLeft();
        let top = rects[startIndex].getTop();
        let right = rects[startIndex].getRight();
        let bottom = rects[startIndex].getBottom();

        for (let i = startIndex + 1; i < startIndex + length; ++i) {
            let rect = rects[i];

            if (rect.getLeft() < left) {
                left = rect.getLeft();
            }

            if (rect.getTop() < top) {
                top = rect.getTop();
            }

            if (rect.getRight() > right) {
                right = rect.getRight();
            }

            if (rect.getBottom() > bottom) {
                bottom = rect.getBottom();
            }
        }

        return new Rectangle(left, top, right - left, bottom - top);
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
        return Utility.toDegrees(atan2);
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
        let ptFs = [point.clone()];
        matrix.transformPoints(ptFs);
        return ptFs[0];
    }

    static transformOneVector(matrix, vector) {
        let vecs = [vector.clone()];
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

    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    static toDegrees(radians) {
        return radians * (180 / Math.PI);
    }
}

class UtilityEdge {

    constructor(minY, maxY, x, dxdy) {
        this.minY = minY;
        this.maxY = maxY;
        this.x = x;
        this.dxdy = dxdy;
    }
}