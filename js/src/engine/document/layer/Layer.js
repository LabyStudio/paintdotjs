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

class Layer {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.properties = new LayerProperties(null, true, false, 255);
        this.invalidated = new EventHandler();
    }

    render(renderArgs, rectangle) {
        throw new Error("Not implemented");
    }

    invalidate(area = this.getBounds()) {
        this.invalidated.fire(this, area);
    }

    renderRegion(renderArgs, region) {
        for (let rectangle of region.rectangles) {
            this.render(renderArgs, rectangle);
        }
    }

    isVisible() {
        return this.properties.visible;
    }

    setVisible(visible) {
        this.properties.visible = visible;
        this.invalidate();
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getBounds() {
        return new Rectangle(0, 0, this.width, this.height);
    }

    getProperties() {
        return this.properties;
    }

    clone() {
        throw new Error("Not implemented");
    }

    static createLayer(documentWorkspace, width, height, name) {
        let layer = new BitmapLayer(documentWorkspace, width, height);
        layer.properties.name = name;
        layer.properties.isBackground = false;
        return layer;
    }

    static createBackgroundLayer(documentWorkspace, width, height) {
        let layer = new BitmapLayer(documentWorkspace, width, height, Color.WHITE);
        layer.properties.name = i18n("layer.backgroundLayer.defaultName");
        layer.properties.isBackground = true;
        return layer;
    }

}
