class Tool {

    // Paint.NET's brush render cache uses 2^8 (256px) tiles. Matching that
    // granularity cuts bookkeeping and canvas-copy calls for continuous strokes.
    static saveTileGranularity = 256;

    constructor(type) {
        this.type = type;
        this.app = app;

        this.selectionChangingListener = this.onSelectionChanging.bind(this);
        this.selectionChangedListener = this.onSelectionChanged.bind(this);
        this.historyExecutingListener = this.onExecutingHistoryMemento.bind(this);
        this.historyExecutedListener = this.onExecutedHistoryMemento.bind(this);

        this.selection = null;
        this.historyStack = null;
        this.active = false;

        this.scratchSurface = null;
        this.savedTiles = null;
        this.savedRegion = null;
        this.bitmapTransaction = null;
    }

    getType() {
        return this.type;
    }

    getSetting(name, fallback = null) {
        return this.type.getSetting(name, fallback);
    }

    usesContinuousPointerCoordinates() {
        return false;
    }

    getCompositeOperation() {
        const operations = {
            normal: "source-over",
            multiply: "multiply",
            screen: "screen",
            overlay: "overlay",
            darken: "darken",
            lighten: "lighten",
            colorDodge: "color-dodge",
            colorBurn: "color-burn",
            hardLight: "hard-light",
            softLight: "soft-light",
            difference: "difference",
            exclusion: "exclusion",
            hue: "hue",
            saturation: "saturation",
            color: "color",
            luminosity: "luminosity"
        };
        return operations[this.getSetting("blendMode", "normal")] || operations.normal;
    }

    isHatchForeground(x, y, style) {
        const px = ((Math.floor(x) % 8) + 8) % 8;
        const py = ((Math.floor(y) % 8) + 8) % 8;
        if (/^percent\d+$/.test(style)) {
            const percent = Number(style.substring(7));
            const bayer = [
                0, 32, 8, 40, 2, 34, 10, 42,
                48, 16, 56, 24, 50, 18, 58, 26,
                12, 44, 4, 36, 14, 46, 6, 38,
                60, 28, 52, 20, 62, 30, 54, 22,
                3, 35, 11, 43, 1, 33, 9, 41,
                51, 19, 59, 27, 49, 17, 57, 25,
                15, 47, 7, 39, 13, 45, 5, 37,
                63, 31, 55, 23, 61, 29, 53, 21
            ];
            return bayer[py * 8 + px] < percent * 64 / 100;
        }
        switch (style) {
            case "horizontal": return py === 0 || py === 4;
            case "vertical": return px === 0 || px === 4;
            case "forwardDiagonal": return (px + py) % 6 === 0;
            case "cross": return px === 0 || px === 4 || py === 0 || py === 4;
            case "diagonalCross": return (px + py) % 6 === 0 || (px - py + 8) % 6 === 0;
            case "lightDownwardDiagonal": return (px - py + 8) % 8 === 0;
            case "lightUpwardDiagonal": return (px + py) % 8 === 0;
            case "darkDownwardDiagonal": return (px - py + 8) % 4 <= 1;
            case "darkUpwardDiagonal": return (px + py) % 4 <= 1;
            case "wideDownwardDiagonal": return (px - py + 8) % 8 <= 2;
            case "wideUpwardDiagonal": return (px + py) % 8 <= 2;
            case "lightHorizontal": return py === 2;
            case "lightVertical": return px === 2;
            case "narrowHorizontal": return py % 3 === 0;
            case "narrowVertical": return px % 3 === 0;
            case "darkHorizontal": return py % 4 <= 1;
            case "darkVertical": return px % 4 <= 1;
            case "dashedDownwardDiagonal": return (px - py + 8) % 6 === 0 && (px + py) % 5 < 3;
            case "dashedUpwardDiagonal": return (px + py) % 6 === 0 && (px - py + 8) % 5 < 3;
            case "dashedHorizontal": return (py === 1 || py === 5) && px < 4;
            case "dashedVertical": return (px === 1 || px === 5) && py < 4;
            case "smallConfetti": return ((px * 3 + py * 5) % 13) < 2;
            case "largeConfetti": return ((Math.floor(px / 2) * 3 + Math.floor(py / 2) * 5) % 7) < 2;
            case "zigZag": return py === Math.abs(3 - px % 7) || py === 7 - Math.abs(3 - px % 7);
            case "wave": return py === Math.round(3.5 + Math.sin(px * Math.PI / 4) * 2);
            case "diagonalBrick": return (px - py + 8) % 4 === 0 || ((px + py) % 8 === 0 && px % 4 < 2);
            case "horizontalBrick": return py % 4 === 0 || (px + (Math.floor(py / 4) % 2) * 4) % 8 === 0;
            case "weave": return (px < 2 && py < 6) || (py >= 4 && py < 6 && px >= 2);
            case "plaid": return px < 2 || py < 2 || (px === 4 && py % 2 === 0) || (py === 4 && px % 2 === 0);
            case "divot": return (px === 2 && py === 2) || (px === 3 && py === 3) || (px === 6 && py === 6);
            case "dottedGrid": return (px === 1 || px === 5) && (py === 1 || py === 5);
            case "dottedDiamond": return (Math.abs(px - 3) + Math.abs(py - 3)) % 4 === 0;
            case "shingle": return py % 4 === 0 || (py % 4 === 1 && (px === 0 || px === 4));
            case "trellis": return (px - py + 8) % 6 === 0 || (px + py) % 6 === 0;
            case "sphere": return Math.round(Math.hypot(px - 3.5, py - 3.5)) === 3;
            case "smallGrid": return px % 4 === 0 || py % 4 === 0;
            case "smallCheckerBoard": return (Math.floor(px / 2) + Math.floor(py / 2)) % 2 === 0;
            case "largeCheckerBoard": return (Math.floor(px / 4) + Math.floor(py / 4)) % 2 === 0;
            case "outlinedDiamond": return Math.abs(px - 3) + Math.abs(py - 3) === 3;
            case "solidDiamond": return Math.abs(px - 3) + Math.abs(py - 3) <= 3;
            case "backwardDiagonal":
            default: return (px - py + 8) % 6 === 0;
        }
    }

    getFillColorAt(x, y, foreground, background) {
        const style = this.getSetting("fillStyle", "solid");
        if (style === "solid") return foreground;
        return this.isHatchForeground(x, y, style) ? foreground : background;
    }

    createFillStyle(context, foreground, background) {
        const style = this.getSetting("fillStyle", "solid");
        if (style === "solid") return foreground.toHex();
        const tile = document.createElement("canvas");
        tile.width = 8;
        tile.height = 8;
        const tileContext = tile.getContext("2d", {alpha: true});
        const image = tileContext.createImageData(8, 8);
        for (let y = 0; y < 8; ++y) {
            for (let x = 0; x < 8; ++x) {
                const color = this.isHatchForeground(x, y, style) ? foreground : background;
                const index = (y * 8 + x) * 4;
                image.data[index] = color.red;
                image.data[index + 1] = color.green;
                image.data[index + 2] = color.blue;
                image.data[index + 3] = color.alpha;
            }
        }
        tileContext.putImageData(image, 0, 0);
        return context.createPattern(tile, "repeat");
    }

    blendPixel(data, index, source, mode = this.getSetting("blendMode", "normal")) {
        const backdrop = [data[index] / 255, data[index + 1] / 255, data[index + 2] / 255];
        const sourceRgb = [source.red / 255, source.green / 255, source.blue / 255];
        const backdropAlpha = data[index + 3] / 255;
        const sourceAlpha = source.alpha / 255;
        const blendChannel = (back, front) => {
            switch (mode) {
                case "multiply": return back * front;
                case "screen": return back + front - back * front;
                case "overlay": return back <= 0.5 ? 2 * back * front : 1 - 2 * (1 - back) * (1 - front);
                case "darken": return Math.min(back, front);
                case "lighten": return Math.max(back, front);
                case "colorDodge": return front >= 1 ? 1 : Math.min(1, back / (1 - front));
                case "colorBurn": return front <= 0 ? 0 : 1 - Math.min(1, (1 - back) / front);
                case "hardLight": return front <= 0.5 ? 2 * back * front : 1 - 2 * (1 - back) * (1 - front);
                case "softLight":
                    if (front <= 0.5) return back - (1 - 2 * front) * back * (1 - back);
                    return back + (2 * front - 1) * ((back <= 0.25
                        ? ((16 * back - 12) * back + 4) * back
                        : Math.sqrt(back)) - back);
                case "difference": return Math.abs(back - front);
                case "exclusion": return back + front - 2 * back * front;
                default: return front;
            }
        };
        const outputAlpha = sourceAlpha + backdropAlpha * (1 - sourceAlpha);
        for (let channel = 0; channel < 3; ++channel) {
            const blended = blendChannel(backdrop[channel], sourceRgb[channel]);
            const premultiplied = sourceAlpha * (1 - backdropAlpha) * sourceRgb[channel]
                + sourceAlpha * backdropAlpha * blended
                + (1 - sourceAlpha) * backdropAlpha * backdrop[channel];
            data[index + channel] = outputAlpha <= 0 ? 0
                : Math.round(Utility.clamp(premultiplied / outputAlpha, 0, 1) * 255);
        }
        data[index + 3] = Math.round(outputAlpha * 255);
    }

    getToleranceThreshold() {
        // Paint.NET 5.1.12's ToleranceUtil first converts the displayed
        // percentage to a byte, then scales that byte by itself. This gives
        // the control its deliberately quadratic response curve.
        const setting = Utility.clamp(Number(this.getSetting("tolerance", 0)), 0, 100) / 100;
        const value = Math.round(setting * 255);
        return Math.round(value * value / 255);
    }

    matchesColorTolerance(data, index, target, tolerance, premultiplied) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        if (red === target[0] && green === target[1]
            && blue === target[2] && alpha === target[3]) return true;
        if (premultiplied && alpha === 0 && target[3] === 0) return true;

        let r1 = red / 255, g1 = green / 255, b1 = blue / 255, a1 = alpha / 255;
        let r2 = target[0] / 255, g2 = target[1] / 255;
        let b2 = target[2] / 255, a2 = target[3] / 255;
        if (premultiplied) {
            r1 = r1 * a1 + (1 - a1) * 0.5;
            g1 = g1 * a1 + (1 - a1) * 0.5;
            b1 = b1 * a1 + (1 - a1) * 0.5;
            r2 = r2 * a2 + (1 - a2) * 0.5;
            g2 = g2 * a2 + (1 - a2) * 0.5;
            b2 = b2 * a2 + (1 - a2) * 0.5;
        }
        const distance = Math.max(1, Math.round(Math.hypot(
            r1 - r2, g1 - g2, b1 - b2, a1 - a2
        ) * 0.5 * 255));
        return distance <= tolerance;
    }

    onActivate() {
        this.selection = this.getSelection();
        this.selection.changing.add(this.selectionChangingListener);
        this.selection.changed.add(this.selectionChangedListener);

        this.historyStack = this.getDocumentWorkspace().getHistory();
        this.historyStack.executing.add(this.historyExecutingListener);
        this.historyStack.executed.add(this.historyExecutedListener);

        this.scratchSurface = this.getDocumentWorkspace().borrowScratchSurface(this.type.getName());
        this.active = true;
    }

    onDeactivate() {
        if (this.bitmapTransaction !== null) {
            this.cancelBitmapTransaction();
        }
        this.active = false;

        this.selection.changing.remove(this.selectionChangingListener);
        this.selection.changed.remove(this.selectionChangedListener);

        this.historyStack.executing.remove(this.historyExecutingListener);
        this.historyStack.executed.remove(this.historyExecutedListener);

        this.getDocumentWorkspace().returnScratchSurface(this.scratchSurface);
    }

    onSelectionChanging() {

    }

    onSelectionChanged() {

    }

    onExecutingHistoryMemento() {

    }

    onExecutedHistoryMemento() {

    }

    onPulse() {
        // TODO panTracking & right click
    }

    onKeyPress(key) {
        return false;
    }

    onModifierKeysChanged() {

    }

    onMouseDown(mouseX, mouseY, button, input = null) {
        return false;
    }

    onMouseMove(mouseX, mouseY, input = null) {
        return false;
    }

    onMouseUp(mouseX, mouseY, button, input = null) {
        return false;
    }

    dispose() {

    }

    saveRegion(saveMeRegion, saveMeBounds) {
        let activeLayer = this.getActiveLayer();

        let regionBounds;
        if (saveMeRegion == null) {
            regionBounds = saveMeBounds;
        } else {
            regionBounds = saveMeRegion.getBounds();
        }

        let bounds = Rectangle.union(regionBounds, saveMeBounds);
        bounds.intersect(activeLayer.getBounds());

        // Rectangle.intersect() keeps the clipped origin even when there is no
        // overlap. For a stroke beyond the right or bottom canvas edge that
        // origin can be outside savedTiles, so there is no tile to query or
        // preserve. This also avoids allocating the tile stencil for a stroke
        // that never touches the layer.
        if (bounds.isEmpty()) return;

        if (this.savedTiles === null) {
            this.savedTiles = new BitVector2D(
                Math.floor((activeLayer.getWidth() + Tool.saveTileGranularity - 1) / Tool.saveTileGranularity),
                Math.floor((activeLayer.getHeight() + Tool.saveTileGranularity - 1) / Tool.saveTileGranularity)
            );
            this.savedTiles.clear(false);
        }

        let leftTile = Math.floor(bounds.getLeft() / Tool.saveTileGranularity);
        let topTile = Math.floor(bounds.getTop() / Tool.saveTileGranularity);
        let rightTile = Math.floor((bounds.getRight() - 1) / Tool.saveTileGranularity);
        let bottomTile = Math.floor((bounds.getBottom() - 1) / Tool.saveTileGranularity);

        for (let tileY = topTile; tileY <= bottomTile; ++tileY) {
            let rowAccumBounds = Rectangle.empty();

            for (let tileX = leftTile; tileX <= rightTile; ++tileX) {
                if (!this.savedTiles.get(tileX, tileY)) {
                    let tileBounds = new Rectangle(
                        tileX * Tool.saveTileGranularity,
                        tileY * Tool.saveTileGranularity,
                        Tool.saveTileGranularity,
                        Tool.saveTileGranularity
                    );

                    tileBounds.intersect(activeLayer.getBounds());

                    if (rowAccumBounds.isEmpty()) {
                        rowAccumBounds = tileBounds;
                    } else {
                        rowAccumBounds = Rectangle.union(rowAccumBounds, tileBounds);
                    }

                    this.savedTiles.set(tileX, tileY, true);
                } else {
                    if (!rowAccumBounds.isEmpty()) {
                        this.scratchSurface.copyRegionFromExact(activeLayer.getSurface(), rowAccumBounds);
                        if (this.bitmapTransaction !== null && !this.bitmapTransaction.fullSnapshot) {
                            this.bitmapTransaction.savedRectangles.push(rowAccumBounds.clone());
                        }
                        rowAccumBounds = Rectangle.empty();
                    }
                }
            }

            if (!rowAccumBounds.isEmpty()) {
                this.scratchSurface.copyRegionFromExact(activeLayer.getSurface(), rowAccumBounds);
                if (this.bitmapTransaction !== null && !this.bitmapTransaction.fullSnapshot) {
                    this.bitmapTransaction.savedRectangles.push(rowAccumBounds.clone());
                }
                rowAccumBounds = Rectangle.empty();
            }
        }

        if (this.savedRegion != null) {
            this.savedRegion.dispose();
            this.savedRegion = null;
        }

        if (saveMeRegion != null) {
            this.savedRegion = saveMeRegion.clone();
        }
    }

    restoreSavedRegion() {
        if (this.savedRegion != null) {
            let activeLayer = this.getActiveLayer();
            activeLayer.getSurface().copyRegionFrom(this.scratchSurface, this.savedRegion.getBounds());
            activeLayer.invalidate(this.savedRegion);
            this.savedRegion.dispose();
            this.savedRegion = null;
        }
    }

    beginBitmapTransaction(copySurface = true) {
        if (this.bitmapTransaction !== null) {
            throw new Error("A bitmap transaction is already active");
        }
        const layer = this.getActiveLayer();
        this.savedTiles = null;
        if (this.savedRegion !== null) {
            this.savedRegion.dispose();
            this.savedRegion = null;
        }
        if (copySurface) this.scratchSurface.copySurface(layer.getSurface());
        this.bitmapTransaction = {
            layer,
            layerIndex: this.getActiveLayerIndex(),
            dirtyBounds: null,
            fullSnapshot: copySurface,
            savedRectangles: []
        };
    }

    updateBitmapTransaction(nextBounds, renderer) {
        if (this.bitmapTransaction === null) {
            throw new Error("No bitmap transaction is active");
        }
        const transaction = this.bitmapTransaction;
        const surface = transaction.layer.getSurface();
        let dirtyBounds = Utility.roundRectangle(nextBounds);
        if (transaction.dirtyBounds !== null) {
            dirtyBounds = Rectangle.union(transaction.dirtyBounds, dirtyBounds);
        }
        dirtyBounds.intersect(surface.getBounds());
        if (!dirtyBounds.isEmpty()) {
            surface.copyRegionFrom(this.scratchSurface, dirtyBounds);
            renderer(surface, dirtyBounds);
            transaction.layer.invalidate(dirtyBounds);
        }
        transaction.dirtyBounds = Utility.roundRectangle(nextBounds);
        transaction.dirtyBounds.intersect(surface.getBounds());
        return dirtyBounds;
    }

    markBitmapTransactionDirty(bounds) {
        if (this.bitmapTransaction === null) return;
        const clipped = Rectangle.intersect(Utility.roundRectangle(bounds),
            this.bitmapTransaction.layer.getBounds());
        this.bitmapTransaction.dirtyBounds = this.bitmapTransaction.dirtyBounds === null
            ? clipped
            : Rectangle.union(this.bitmapTransaction.dirtyBounds, clipped);
    }

    commitBitmapTransaction(name = this.getName(), image = this.getImage()) {
        const memento = this.takeBitmapTransactionMemento(name, image);
        if (memento === null) return false;
        this.historyStack.pushNewMemento(memento);
        return true;
    }

    takeBitmapTransactionMemento(name = this.getName(), image = this.getImage()) {
        if (this.bitmapTransaction === null) return null;
        const transaction = this.bitmapTransaction;
        this.bitmapTransaction = null;
        if (transaction.dirtyBounds === null || transaction.dirtyBounds.isEmpty()) {
            this.resetSavedTileState();
            return null;
        }
        const region = transaction.fullSnapshot || transaction.savedRectangles.length === 0
            ? Region.fromRectangle(transaction.dirtyBounds)
            : Region.fromRectangles(transaction.savedRectangles.map(rectangle => rectangle.clone()));
        const memento = new BitmapHistoryMemento(
            name, image, this.getDocumentWorkspace(), transaction.layerIndex,
            region, this.scratchSurface
        );
        region.dispose();
        for (const rectangle of transaction.savedRectangles) rectangle.dispose();
        this.resetSavedTileState();
        return memento;
    }

    cancelBitmapTransaction() {
        if (this.bitmapTransaction === null) return false;
        const transaction = this.bitmapTransaction;
        this.bitmapTransaction = null;
        if (transaction.dirtyBounds !== null && !transaction.dirtyBounds.isEmpty()) {
            if (!transaction.fullSnapshot && transaction.savedRectangles.length > 0) {
                for (const rectangle of transaction.savedRectangles) {
                    transaction.layer.getSurface().copyRegionFrom(this.scratchSurface, rectangle);
                }
            } else {
                transaction.layer.getSurface().copyRegionFrom(this.scratchSurface, transaction.dirtyBounds);
            }
            transaction.layer.invalidate(transaction.dirtyBounds);
        }
        for (const rectangle of transaction.savedRectangles) rectangle.dispose();
        this.resetSavedTileState();
        return true;
    }

    resetSavedTileState() {
        this.savedTiles = null;
        if (this.savedRegion !== null) this.savedRegion.dispose();
        this.savedRegion = null;
    }

    isActive() {
        return this.active;
    }

    getName() {
        return this.type.getName();
    }

    getImage() {
        return this.type.getIconSrc();
    }

    getDocumentWorkspace() {
        return this.app.getActiveDocumentWorkspace();
    }

    getSurfaceBox() {
        return this.getDocumentWorkspace().getSurfaceBox();
    }

    getSelection() {
        return this.getDocumentWorkspace().getSelection();
    }

    getActiveLayerIndex() {
        return this.getDocumentWorkspace().getActiveLayerIndex();
    }

    setActiveLayerIndex(index) {
        this.getDocumentWorkspace().setActiveLayerIndex(index);
    }

    getActiveLayer() {
        return this.getDocumentWorkspace().getActiveLayer();
    }

    getColor(button = MouseButton.LEFT) {
        let colors = FormRegistry.get("colorsForm");
        if (colors === null) {
            return button === MouseButton.RIGHT ? Color.WHITE : Color.BLACK;
        }
        return (button === MouseButton.RIGHT ? colors.secondaryColor : colors.mainColor).copy();
    }

    setActiveLayer(layer) {
        this.getDocumentWorkspace().setActiveLayer(layer);
    }
}
