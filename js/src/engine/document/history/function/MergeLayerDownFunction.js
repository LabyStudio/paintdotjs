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

class MergeLayerDownFunction extends HistoryFunction {

    constructor(layerIndex) {
        super();
        this.layerIndex = layerIndex;
    }

    onExecute(documentWorkspace) {
        let document = documentWorkspace.getDocument();
        let layers = document.getLayers();
        if (this.layerIndex < 1 || this.layerIndex >= layers.size()) {
            throw new Error("layerIndex must be greater than or equal to 1, and a valid layer index. layerIndex=" + this.layerIndex + ", allowableRange=[0," + layers.size() + ")");
        }

        let bottomLayerIndex = this.layerIndex - 1;
        let bounds = document.getBounds();
        let region = Region.fromRectangle(bounds);

        let bitmapMemento = new BitmapHistoryMemento(
            i18n("mergeLayerDown.historyMementoName"),
            "assets/icons/menu_layers_merge_layer_down_icon.png",
            documentWorkspace,
            bottomLayerIndex,
            region
        );

        let bottomLayer = layers.getAt(bottomLayerIndex);
        let topLayer = layers.getAt(this.layerIndex);
        let bottomRA = new RenderArgs(bottomLayer.getSurface());

        topLayer.renderRegion(bottomRA, region);
        bottomLayer.invalidate();

        let deleteLayerFunction = new DeleteLayerFunction(this.layerIndex);
        let deleteLayerMemento = deleteLayerFunction.execute(documentWorkspace);

        return new CompoundHistoryMemento(
            bitmapMemento.getName(),
            bitmapMemento.getImage(),
            [
                bitmapMemento,
                deleteLayerMemento
            ]
        );
    }

}