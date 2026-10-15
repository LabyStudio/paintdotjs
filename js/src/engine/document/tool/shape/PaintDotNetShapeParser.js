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

class PaintDotNetShapeParser {

    static parse(source, fileName) {
        if (typeof source !== "string" || source.length === 0) {
            throw new Error(`${fileName} is empty.`);
        }
        if (source.length > 512 * 1024) {
            throw new Error(`${fileName} exceeds the 512 KB shape limit.`);
        }
        if (/<!DOCTYPE|<!ENTITY/i.test(source)) {
            throw new Error(`${fileName} contains unsupported XML declarations.`);
        }

        const document = new DOMParser().parseFromString(source, "application/xml");
        if (document.getElementsByTagName("parsererror").length > 0) {
            throw new Error(`${fileName} is not valid XML.`);
        }

        const root = document.documentElement;
        if (root.localName !== "SimpleGeometryShape") {
            throw new Error(`${fileName} must contain a SimpleGeometryShape root element.`);
        }

        const name = this.requiredText(root.getAttribute("DisplayName"), "DisplayName", fileName);
        let geometry;
        const geometryAttribute = root.getAttribute("Geometry");
        if (root.hasAttribute("Geometry")) {
            if (this.childElements(root).length > 0) {
                throw new Error(`${fileName} cannot define Geometry both as an attribute and as XML elements.`);
            }
            geometry = this.parsePathData(geometryAttribute, fileName);
        } else {
            const children = this.childElements(root);
            if (children.length !== 1) {
                throw new Error(`${fileName} must contain exactly one geometry element.`);
            }
            geometry = this.parseGeometry(children[0], "nonzero", fileName);
        }

        this.validatePath(geometry.path, fileName);
        if (geometry.fillPath !== "") {
            this.validatePath(geometry.fillPath, fileName);
        }

        const viewBox = ShapeCatalog.measurePath(geometry.path);
        if (viewBox === null) {
            throw new Error(`${fileName} does not contain visible geometry.`);
        }

        return {
            name,
            path: geometry.path,
            fillPath: geometry.fillPath,
            fillRule: geometry.fillRule,
            viewBox
        };
    }

    static parseGeometry(element, inheritedFillRule, fileName) {
        const fillRule = this.parseFillRule(element.getAttribute("FillRule"), inheritedFillRule, fileName);
        switch (element.localName) {
            case "GeometryGroup":
                return this.parseGeometryGroup(element, fillRule, fileName);
            case "PathGeometry":
                return this.parsePathGeometry(element, fillRule, fileName);
            case "RectangleGeometry":
                return this.parseRectangleGeometry(element, fillRule, fileName);
            case "EllipseGeometry":
                return this.parseEllipseGeometry(element, fillRule, fileName);
            case "LineGeometry":
                return this.parseLineGeometry(element, fillRule, fileName);
            default:
                throw new Error(`${fileName} uses unsupported geometry element ${element.localName}.`);
        }
    }

    static parseGeometryGroup(element, fillRule, fileName) {
        const children = this.childElements(element);
        if (children.length === 0) {
            throw new Error(`${fileName} contains an empty GeometryGroup.`);
        }

        const geometries = children.map(child => this.parseGeometry(child, fillRule, fileName));
        return {
            path: geometries.map(geometry => geometry.path).join(" "),
            fillPath: geometries.map(geometry => geometry.fillPath).filter(Boolean).join(" "),
            fillRule
        };
    }

    static parsePathGeometry(element, fillRule, fileName) {
        const figures = this.childElements(element);
        if (figures.length === 0 || figures.some(figure => figure.localName !== "PathFigure")) {
            throw new Error(`${fileName} contains an invalid PathGeometry.`);
        }

        const paths = figures.map(figure => this.parsePathFigure(figure, fileName));
        return {
            path: paths.map(figure => figure.path).join(" "),
            fillPath: paths.filter(figure => figure.filled).map(figure => figure.path).join(" "),
            fillRule
        };
    }

    static parsePathFigure(element, fileName) {
        const start = this.parsePoint(element.getAttribute("StartPoint"), "StartPoint", fileName);
        const commands = [`M ${start[0]} ${start[1]}`];

        for (const segment of this.childElements(element)) {
            commands.push(this.parseSegment(segment, fileName));
        }
        if (this.parseBoolean(element.getAttribute("IsClosed"), false, "IsClosed", fileName)) {
            commands.push("Z");
        }

        return {
            path: commands.join(" "),
            filled: this.parseBoolean(element.getAttribute("IsFilled"), true, "IsFilled", fileName)
        };
    }

    static parseSegment(element, fileName) {
        switch (element.localName) {
            case "LineSegment": {
                const point = this.parsePoint(element.getAttribute("Point"), "Point", fileName);
                return `L ${point[0]} ${point[1]}`;
            }
            case "ArcSegment": {
                const point = this.parsePoint(element.getAttribute("Point"), "Point", fileName);
                const size = this.parsePoint(element.getAttribute("Size"), "Size", fileName);
                const rotation = this.optionalNumber(element.getAttribute("RotationAngle"), 0, "RotationAngle", fileName);
                const large = this.parseBoolean(element.getAttribute("IsLargeArc"), false, "IsLargeArc", fileName) ? 1 : 0;
                const sweepValue = (element.getAttribute("SweepDirection") || "CounterClockwise").toLowerCase();
                if (sweepValue !== "clockwise" && sweepValue !== "counterclockwise") {
                    throw new Error(`${fileName} contains an invalid SweepDirection.`);
                }
                const sweep = sweepValue === "clockwise" ? 1 : 0;
                return `A ${size[0]} ${size[1]} ${rotation} ${large} ${sweep} ${point[0]} ${point[1]}`;
            }
            case "BezierSegment": {
                const first = this.parsePoint(element.getAttribute("Point1"), "Point1", fileName);
                const second = this.parsePoint(element.getAttribute("Point2"), "Point2", fileName);
                const end = this.parsePoint(element.getAttribute("Point3"), "Point3", fileName);
                return `C ${first.join(" ")} ${second.join(" ")} ${end.join(" ")}`;
            }
            case "QuadraticBezierSegment": {
                const control = this.parsePoint(element.getAttribute("Point1"), "Point1", fileName);
                const end = this.parsePoint(element.getAttribute("Point2"), "Point2", fileName);
                return `Q ${control.join(" ")} ${end.join(" ")}`;
            }
            case "PolyLineSegment":
                return "L " + this.parsePoints(element.getAttribute("Points"), "Points", fileName).join(" ");
            case "PolyBezierSegment": {
                const points = this.parsePoints(element.getAttribute("Points"), "Points", fileName);
                if (points.length % 6 !== 0) {
                    throw new Error(`${fileName} contains an invalid PolyBezierSegment.`);
                }
                return "C " + points.join(" ");
            }
            case "PolyQuadraticBezierSegment": {
                const points = this.parsePoints(element.getAttribute("Points"), "Points", fileName);
                if (points.length % 4 !== 0) {
                    throw new Error(`${fileName} contains an invalid PolyQuadraticBezierSegment.`);
                }
                let commands = [];
                for (let index = 0; index < points.length; index += 4) {
                    commands.push(`Q ${points.slice(index, index + 4).join(" ")}`);
                }
                return commands.join(" ");
            }
            default:
                throw new Error(`${fileName} uses unsupported path segment ${element.localName}.`);
        }
    }

    static parseRectangleGeometry(element, fillRule, fileName) {
        const rect = this.parseNumbers(element.getAttribute("Rect"), 4, "Rect", fileName);
        const [x, y, width, height] = rect;
        if (width <= 0 || height <= 0) {
            throw new Error(`${fileName} contains a rectangle with an invalid size.`);
        }

        const radiusX = Math.max(0, Math.min(width / 2,
            this.optionalNumber(element.getAttribute("RadiusX"), 0, "RadiusX", fileName)));
        const radiusY = Math.max(0, Math.min(height / 2,
            this.optionalNumber(element.getAttribute("RadiusY"), 0, "RadiusY", fileName)));
        let path;
        if (radiusX === 0 || radiusY === 0) {
            path = `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
        } else {
            path = `M ${x + radiusX} ${y} H ${x + width - radiusX}`
                + ` A ${radiusX} ${radiusY} 0 0 1 ${x + width} ${y + radiusY}`
                + ` V ${y + height - radiusY}`
                + ` A ${radiusX} ${radiusY} 0 0 1 ${x + width - radiusX} ${y + height}`
                + ` H ${x + radiusX}`
                + ` A ${radiusX} ${radiusY} 0 0 1 ${x} ${y + height - radiusY}`
                + ` V ${y + radiusY}`
                + ` A ${radiusX} ${radiusY} 0 0 1 ${x + radiusX} ${y} Z`;
        }
        return {path, fillPath: path, fillRule};
    }

    static parseEllipseGeometry(element, fillRule, fileName) {
        const center = this.parsePoint(element.getAttribute("Center"), "Center", fileName);
        const radiusX = this.requiredNumber(element.getAttribute("RadiusX"), "RadiusX", fileName);
        const radiusY = this.requiredNumber(element.getAttribute("RadiusY"), "RadiusY", fileName);
        if (radiusX <= 0 || radiusY <= 0) {
            throw new Error(`${fileName} contains an ellipse with an invalid radius.`);
        }
        const path = `M ${center[0] - radiusX} ${center[1]}`
            + ` A ${radiusX} ${radiusY} 0 1 0 ${center[0] + radiusX} ${center[1]}`
            + ` A ${radiusX} ${radiusY} 0 1 0 ${center[0] - radiusX} ${center[1]} Z`;
        return {path, fillPath: path, fillRule};
    }

    static parseLineGeometry(element, fillRule, fileName) {
        const start = this.parsePoint(element.getAttribute("StartPoint"), "StartPoint", fileName);
        const end = this.parsePoint(element.getAttribute("EndPoint"), "EndPoint", fileName);
        return {path: `M ${start.join(" ")} L ${end.join(" ")}`, fillPath: "", fillRule};
    }

    static parsePathData(value, fileName) {
        let path = value.trim();
        let fillRule = "nonzero";
        const prefix = /^F([01])(?:\s+|(?=[Mm]))/i.exec(path);
        if (prefix !== null) {
            fillRule = prefix[1] === "0" ? "evenodd" : "nonzero";
            path = path.slice(prefix[0].length).trim();
        }
        if (path === "") {
            throw new Error(`${fileName} contains empty Geometry path data.`);
        }
        return {path, fillPath: path, fillRule};
    }

    static validatePath(path, fileName) {
        if (path.length > 256 * 1024 || !/^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/.test(path)) {
            throw new Error(`${fileName} contains unsupported geometry path data.`);
        }
    }

    static parseFillRule(value, fallback, fileName) {
        if (value === null || value.trim() === "") {
            return fallback;
        }
        const normalized = value.toLowerCase();
        if (normalized === "nonzero") {
            return "nonzero";
        }
        if (normalized === "evenodd") {
            return "evenodd";
        }
        throw new Error(`${fileName} contains an invalid FillRule.`);
    }

    static parseBoolean(value, fallback, label, fileName) {
        if (value === null || value.trim() === "") {
            return fallback;
        }
        if (value.toLowerCase() === "true") {
            return true;
        }
        if (value.toLowerCase() === "false") {
            return false;
        }
        throw new Error(`${fileName} contains an invalid ${label}.`);
    }

    static parsePoint(value, label, fileName) {
        return this.parseNumbers(value, 2, label, fileName);
    }

    static parsePoints(value, label, fileName) {
        const numbers = this.parseNumbers(value, null, label, fileName);
        if (numbers.length < 2 || numbers.length % 2 !== 0) {
            throw new Error(`${fileName} contains invalid ${label}.`);
        }
        return numbers;
    }

    static parseNumbers(value, expectedCount, label, fileName) {
        if (value === null) {
            throw new Error(`${fileName} is missing ${label}.`);
        }
        const matches = value.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || [];
        const numbers = matches.map(Number);
        if ((expectedCount !== null && numbers.length !== expectedCount) || !numbers.every(Number.isFinite)) {
            throw new Error(`${fileName} contains invalid ${label}.`);
        }
        return numbers;
    }

    static requiredNumber(value, label, fileName) {
        return this.parseNumbers(value, 1, label, fileName)[0];
    }

    static optionalNumber(value, fallback, label, fileName) {
        return value === null || value.trim() === "" ? fallback : this.requiredNumber(value, label, fileName);
    }

    static requiredText(value, label, fileName) {
        if (value === null || !value.trim() || value.length > 80) {
            throw new Error(`${fileName} must provide ${label} with at most 80 characters.`);
        }
        return value.trim();
    }

    static childElements(element) {
        return Array.from(element.childNodes).filter(node => node.nodeType === 1);
    }
}
