class Polygon {

    constructor(bounds = [], holes = []) {
        this.gpcPolygon = window.GPC.Polygon.fromVertices({bounds, holes});
    }

    toGraphicsPath() {
        let result = this.gpcPolygon;
        let entries = result.pointList ? [result] : result.polyList;
        let vertexLists = [];

        for (let entry of entries) {
            let list = [];
            for (let pointEntry of entry.pointList) {
                let point = new Point(pointEntry.x, pointEntry.y);
                list.push(point);
            }

            let vertexList = new VertexList(
                list,
                entry.isHole
            );
            vertexLists.push(vertexList);
        }

        return new GraphicsPath(vertexLists);
    }

    static clip(combineMode, basePoly, clipPoly) {
        let result = Polygon.getClipFunctionForMode(combineMode)(basePoly.gpcPolygon, clipPoly.gpcPolygon);
        let entries = result.pointList ? [result] : result.polyList;

        let bounds = [];
        let holes = [];

        for (let entry of entries) {
            let target = entry.isHole ? holes : bounds;

            let list = [];
            for (let pointEntry of entry.pointList) {
                let point = new Point(pointEntry.x, pointEntry.y);
                list.push(point);
            }
            target.push(list);
        }

        return new Polygon(bounds, holes);
    }

    static getClipFunctionForMode(mode) {
        let polygon = window.GPC.Polygon;
        switch (mode) {
            case CombineMode.EXCLUDE:
                return polygon.difference;
            case CombineMode.INTERSECT:
                return polygon.intersection;
            case CombineMode.UNION:
                return polygon.union;
            case CombineMode.XOR:
                return polygon.xor;
            default:
                throw new Error("Unknown combine mode: " + mode);
        }
    }

    static fromGraphicsPath(graphicsPath) {
        let bounds = [];
        let holes = [];
        for (let vertexList of graphicsPath.getVertexLists()) {
            let target = vertexList.isHole() ? holes : bounds;
            target.push(vertexList.vertices);
        }
        return new Polygon(bounds, holes);
    }
}