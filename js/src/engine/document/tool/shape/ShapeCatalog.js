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

class ShapeCatalog {

    static customShapes = new Map();

    static has(shape) {
        return ShapeCatalog.customShapes.has(shape);
    }

    static getEntries() {
        return ShapeCatalog.getSortedShapes()
            .map(shape => [shape.id, shape.name]);
    }

    static getCustomGroup() {
        return {
            label: "Custom",
            values: ShapeCatalog.getSortedShapes().map(shape => shape.id)
        };
    }

    static getSortedShapes() {
        return Array.from(ShapeCatalog.customShapes.values()).sort((left, right) =>
            left.fileName.localeCompare(right.fileName, undefined, {sensitivity: "base"}));
    }

    static register(shape) {
        if (ShapeCatalog.has(shape.id)) {
            throw new Error(`Shape ${shape.id} is already registered.`);
        }
        const measuredViewBox = ShapeCatalog.measurePath(shape.path);
        ShapeCatalog.customShapes.set(shape.id, {
            ...shape,
            viewBox: measuredViewBox || shape.viewBox
        });
    }

    static unregister(sourceId) {
        for (const [id, shape] of ShapeCatalog.customShapes) {
            if (shape.sourceId === sourceId) {
                ShapeCatalog.customShapes.delete(id);
            }
        }
    }

    static getDefinition(shape) {
        return ShapeCatalog.customShapes.get(shape) || null;
    }

    static measurePath(pathData) {
        if (typeof document === "undefined" || typeof document.createElementNS !== "function") {
            return null;
        }
        const namespace = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(namespace, "svg");
        const path = document.createElementNS(namespace, "path");
        svg.style.cssText = "position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:visible";
        path.setAttribute("d", pathData);
        svg.appendChild(path);
        document.body.appendChild(svg);
        try {
            const bounds = path.getBBox();
            if (bounds.width > 0 || bounds.height > 0) {
                const width = Math.max(bounds.width, 1);
                const height = Math.max(bounds.height, 1);
                return [bounds.x - (width - bounds.width) / 2,
                    bounds.y - (height - bounds.height) / 2, width, height];
            }
        } catch (error) {
            console.warn("Could not measure custom shape geometry", error);
        } finally {
            svg.remove();
        }
        return null;
    }

    static getIconSource(shape) {
        const definition = ShapeCatalog.getDefinition(shape);
        const viewBox = definition.viewBox.join(" ");
        const strokeWidth = Math.max(definition.viewBox[2], definition.viewBox[3]) / 20;
        const fill = definition.fillPath
            ? `<path d="${definition.fillPath}" fill="#4f86b8" fill-rule="${definition.fillRule}"/>`
            : "";
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`
            + fill
            + `<path d="${definition.path}" fill="none" stroke="#b9dcff" stroke-width="${strokeWidth}" `
            + 'stroke-linejoin="round" stroke-linecap="round"/></svg>';
        return "data:image/svg+xml," + encodeURIComponent(svg);
    }

    static getTooltip(shape) {
        const definition = ShapeCatalog.getDefinition(shape);
        if (definition === null) {
            return "";
        }
        return `${definition.name}\nLocation: ${definition.fileName}`;
    }

    static getFillRule(shape) {
        return ShapeCatalog.getDefinition(shape)?.fillRule || "nonzero";
    }

    static createPath(shape, rect, purpose = "stroke") {
        if (!ShapeCatalog.has(shape) || typeof Path2D === "undefined" || typeof DOMMatrix === "undefined") {
            return null;
        }
        const definition = ShapeCatalog.getDefinition(shape);
        const sourcePath = purpose === "fill" ? definition.fillPath : definition.path;
        if (!sourcePath) {
            return null;
        }
        const [x, y, width, height] = definition.viewBox;
        const path = new Path2D();
        const source = new Path2D(sourcePath);
        const matrix = new DOMMatrix([
            rect.width / width, 0,
            0, rect.height / height,
            rect.x - x * rect.width / width,
            rect.y - y * rect.height / height
        ]);
        path.addPath(source, matrix);
        return path;
    }
}
