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

class SurfaceBox {

    constructor(app) {
        this.app = app;
        this.rendererList = [];

        this.surface = null;

        this.baseRenderer = new SurfaceBoxBaseRenderer(this, null);
        this.addRenderer(this.baseRenderer);
    }

    setSurface(surface) {
        this.surface = surface;
    }

    render(destination, renderBounds) {
        for (let renderer of this.rendererList) {
            if (!renderer.isVisible()) {
                continue;
            }
            renderer.render(destination, renderBounds);
        }
    }

    addRenderer(renderer) {
        this.rendererList.push(renderer);
    }

    removeRenderer(renderer) {
        let index = this.rendererList.indexOf(renderer);
        if (index !== -1) {
            this.rendererList.splice(index, 1);
        }
    }

    getScaleFactorRatio() {
        let documentWorkspace = this.app.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return 1;
        }
        return documentWorkspace.getZoom();
    }

    getRendererList() {
        return this.rendererList;
    }

    getSurface() {
        return this.surface;
    }

    getApp() {
        return this.app;
    }

}