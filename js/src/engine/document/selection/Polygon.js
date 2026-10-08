/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

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

            if (list.length === 0) continue;

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
        // Keep the clipping library's result directly. Reconstructing it via
        // fromVertices is both lossy and invalid for an empty result (such as
        // inverting Select All), because GPC cannot build a polygon from zero
        // contours.
        let polygon = Object.create(Polygon.prototype);
        polygon.gpcPolygon = result;
        return polygon;
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
