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

class FillSelectionFunction extends HistoryFunction {

    constructor(color, name = i18n("menu.edit.fillSelection.text"),
                image = "assets/icons/menu_edit_fill_selection_icon.png") {
        super();
        this.color = color.copy();
        this.name = name;
        this.image = image;
    }

    onExecute(documentWorkspace) {
        const selection = documentWorkspace.getSelection();
        if (selection.isEmpty()) return null;

        const layer = documentWorkspace.getActiveLayer();
        if (!(layer instanceof BitmapLayer)) return null;

        const path = selection.createPath();
        const surface = layer.getSurface();
        const bounds = FillSelectionFunction.getPixelBounds(path, surface.getBounds());
        if (bounds.isEmpty()) {
            path.dispose();
            return null;
        }

        const changedRegion = Region.fromRectangle(bounds.clone());
        const memento = new BitmapHistoryMemento(
            this.name,
            this.image,
            documentWorkspace,
            documentWorkspace.getActiveLayerIndex(),
            changedRegion
        );
        changedRegion.dispose();

        const context = surface.context;
        context.save();
        FillSelectionFunction.tracePath(context, path);
        context.clip("evenodd");
        // Paint.NET's fill-selection operation replaces pixels. Clearing first
        // is important when the chosen color is translucent: source-over alone
        // would blend it with the old pixels instead of writing that alpha.
        context.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1;
        context.fillStyle = this.color.toHex();
        context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        context.restore();

        path.dispose();
        layer.invalidate(bounds);
        return memento;
    }

    static getPixelBounds(path, surfaceBounds) {
        const pathBounds = path.getBounds();
        return Rectangle.intersect(Rectangle.absolute(
            Math.floor(pathBounds.getLeft()),
            Math.floor(pathBounds.getTop()),
            Math.ceil(pathBounds.getRight()),
            Math.ceil(pathBounds.getBottom())
        ), surfaceBounds);
    }

    static tracePath(context, path) {
        context.beginPath();
        for (const vertexList of path.getVertexLists()) {
            const vertices = vertexList.getVertices();
            if (vertices.length === 0) continue;
            context.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; ++i) {
                context.lineTo(vertices[i].x, vertices[i].y);
            }
            context.closePath();
        }
    }
}
