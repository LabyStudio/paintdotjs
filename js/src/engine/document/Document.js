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

class Document {

    constructor(width, height, resolution = 96) {
        this.width = width;
        this.height = height;
        this.resolution = Math.max(0.01, Number(resolution) || 96);

        // Bind event handlers
        this.onLayerInvalidated = this.onLayerInvalidated.bind(this);

        this.layers = new LayerList(this);
        this.layers.changing.add(() => {
            for (let layer of this.layers.layers) {
                layer.invalidated.remove(this.onLayerInvalidated);
            }
        });
        this.layers.changed.add(() => {
            for (let layer of this.layers.layers) {
                layer.invalidated.add(this.onLayerInvalidated);
            }
            this.invalidate();
        });

        this.invalidated = new EventHandler();

        this.updateRegion = [];
    }

    addLayer(layer) {
        this.layers.addLayer(layer);
    }

    update(renderArgs) {
        let region = Region.fromRectangles(this.updateRegion);
        let updateScansContext = new UpdateScansContext(this, region);
        updateScansContext.update(renderArgs);
    }

    invalidate(area = Rectangle.relative(0, 0, this.width, this.height)) {
        let rectangles;
        if (area instanceof Region) {
            rectangles = area.getRectangles();
        } else if (Array.isArray(area)) {
            rectangles = area;
        } else {
            rectangles = [area];
        }

        const documentBounds = this.getBounds();
        this.updateRegion = rectangles
            .map(rectangle => Rectangle.intersect(rectangle, documentBounds))
            .filter(rectangle => !rectangle.isEmpty());

        // Fire event
        this.invalidated.fire(this, area);
    }

    onLayerInvalidated(layer, rectangle) {
        this.invalidate(rectangle);
    }

    renderRegion(renderArgs, region) {
        // Clear region
        for (let rectangle of region.rectangles) {
            renderArgs.getSurface().context.clearRect(
                rectangle.x,
                rectangle.y,
                rectangle.width,
                rectangle.height,
            );
        }

        // Render layers
        for (let layer of this.layers.layers) {
            if (!layer.isVisible()) {
                continue;
            }
            layer.renderRegion(renderArgs, region);
        }
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getResolution() {
        return this.resolution;
    }

    setResolution(resolution) {
        this.resolution = Math.max(0.01, Number(resolution) || 96);
    }

    pixelToPhysical(pixels, unit) {
        if (unit === "inch") return pixels / this.resolution;
        if (unit === "centimeter") return pixels / this.resolution * 2.54;
        return pixels;
    }

    getLayers() {
        return this.layers;
    }

    getBounds() {
        return new Rectangle(0, 0, this.width, this.height);
    }
}
