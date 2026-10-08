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

class BitmapLayer extends Layer {

    constructor(documentWorkspace, width, height, fillColor = null) {
        super(width, height);

        this.documentWorkspace = documentWorkspace;

        this.surface = Surface.create(width, height);
        if (fillColor !== null) {
            this.surface.clear(fillColor);
        }
    }

    render(renderArgs, rectangle) {
        // Apply layer properties while compositing, without changing the
        // layer's source pixels. This mirrors Paint.NET's non-destructive
        // opacity behavior and keeps editing operations at full fidelity.
        const opacityValue = this.properties.opacity === undefined ? 255 : this.properties.opacity;
        const opacity = Math.max(0, Math.min(255, opacityValue)) / 255;
        const blendMode = LayerProperties.getBlendMode(this.properties.blendMode);
        this.surface.render(renderArgs, rectangle, opacity, blendMode);

        // Fire event
        let app = this.documentWorkspace.getApp();
        app.fire("document:render_layer_region", this, rectangle);
    }

    clone() {
        let layer = new BitmapLayer(this.documentWorkspace, this.width, this.height);
        layer.surface = this.surface.clone();
        layer.properties = this.properties.clone();
        return layer;
    }

    dispose() {
        if (this.surface !== null) {
            this.surface.dispose();
            this.surface = null;
        }
    }

    getSurface() {
        return this.surface;
    }

    getDocumentWorkspace() {
        return this.documentWorkspace;
    }

}
