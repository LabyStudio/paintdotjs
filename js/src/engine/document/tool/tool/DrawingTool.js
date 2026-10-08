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

class DrawingTool extends Tool {

    constructor(type, width = 1, erase = false, sampledStroke = false) {
        super(type);
        this.width = width;
        this.erase = erase;
        this.tracking = false;
        this.button = MouseButton.LEFT;
        this.lastPoint = null;
        this.lastPressure = 1;
        this.smoothedPoint = null;
        this.changedBounds = null;
        this.sampledStroke = sampledStroke;
        this.strokeSurface = null;
        this.hasStrokeSample = false;
        this.distanceSinceLastSample = 0;
        this.presentationFrame = null;
        this.pendingStrokeBounds = null;
        this.brushProfileCache = new Map();
        this.brushSpriteCache = new Map();
    }

    getWidth() {
        return Number(this.getSetting("width", this.width));
    }

    usesContinuousPointerCoordinates() {
        return this.sampledStroke;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursor("crosshair");
    }

    onDeactivate() {
        if (this.tracking) {
            this.commitStroke();
        }
        super.onDeactivate();
    }

    onMouseDown(x, y, button, input = null) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) {
            return false;
        }
        // Browser pointer capture can be interrupted by focus changes, device
        // cancellation, or a second contact. AppView normally finishes that
        // stroke, but recover here as well so a stale transaction can never
        // make the next valid stroke fail.
        if (this.tracking) {
            this.commitStroke();
        }
        else if (this.bitmapTransaction !== null) {
            this.cancelBitmapTransaction();
        }
        // Sampled strokes are repeatedly rebuilt from their original pixels.
        // Keep one immutable snapshot for the whole stroke. Lazily capturing
        // 256px tiles can capture a tile after an earlier presentation has
        // already modified it, and restoring that mixed snapshot later erases
        // old pixels along an exact tile boundary.
        this.beginBitmapTransaction(this.sampledStroke);
        this.tracking = true;
        this.button = button;
        this.lastPoint = new Point(x, y);
        this.smoothedPoint = this.lastPoint.clone();
        this.lastPressure = this.getInputPressure(input);
        this.changedBounds = new Rectangle(x, y, 1, 1);
        if (this.sampledStroke) {
            const surface = this.getActiveLayer().getSurface();
            this.strokeSurface = Surface.create(surface.width, surface.height);
            this.hasStrokeSample = false;
            this.distanceSinceLastSample = 0;
            this.pendingStrokeBounds = null;
        }
        this.drawSegment(this.lastPoint, this.lastPoint, this.lastPressure, this.lastPressure);
        if (this.strokeSurface !== null) {
            this.requestStrokePresentation();
        }
        return true;
    }

    onMouseMove(x, y, input = null) {
        if (!this.tracking) {
            return false;
        }
        const samples = input !== null && Array.isArray(input.samples) && input.samples.length > 0
            ? input.samples
            : [{x, y, pressure: this.getInputPressure(input)}];
        let drewSample = false;
        for (const sample of samples) {
            let point = new Point(sample.x, sample.y);
            if (this.getSetting("smoothing", false)) {
                // Paint.NET 5 smooths the input path before brush sampling. An
                // exponential low-pass gives canvas the same stable path while
                // still consuming every coalesced pointer sample.
                const weight = 0.55;
                point = new Point(
                    this.smoothedPoint.x + (point.x - this.smoothedPoint.x) * weight,
                    this.smoothedPoint.y + (point.y - this.smoothedPoint.y) * weight
                );
                this.smoothedPoint = point.clone();
            } else {
                this.smoothedPoint = point.clone();
            }
            if (point.equals(this.lastPoint)) {
                continue;
            }
            const pressure = this.getInputPressure(sample);
            this.drawSegment(this.lastPoint, point, this.lastPressure, pressure);
            drewSample = true;
            this.lastPoint = point;
            this.lastPressure = pressure;
        }
        // The composition surface cannot safely retain the outside of a dirty
        // rectangle while the document is shown at a scaled zoom: the update
        // edge becomes a transparent seam. Recompose once per pointer event,
        // after all coalesced samples have been added to the v5-style stroke.
        if (drewSample && this.strokeSurface !== null) {
            this.requestStrokePresentation();
        }
        return true;
    }

    onMouseUp(x, y, button, input = null) {
        if (!this.tracking || button !== this.button) {
            return false;
        }
        this.onMouseMove(x, y, input);
        this.commitStroke();
        return true;
    }

    getInputPressure(input) {
        if (!this.getSetting("pressure", false)) {
            return 1;
        }
        const pressure = input && Number.isFinite(Number(input.pressure))
            ? Number(input.pressure)
            : 1;
        return Utility.clamp(pressure, 0.05, 1);
    }

    commitStroke() {
        this.tracking = false;
        if (this.presentationFrame !== null) {
            cancelAnimationFrame(this.presentationFrame);
            this.presentationFrame = null;
        }
        this.presentStroke();
        const changedBounds = this.getClippedChangedBounds();
        this.markBitmapTransactionDirty(changedBounds);
        this.commitBitmapTransaction();
        if (this.strokeSurface !== null) {
            this.strokeSurface.dispose();
        }
        this.strokeSurface = null;
        this.pendingStrokeBounds = null;
        // Rebuild the complete composition once at the end. Incremental updates
        // stay fast while drawing, while this final pass removes any scaled-view
        // seam at the dirty-region boundary.
        if (!changedBounds.isEmpty()) {
            this.getActiveLayer().invalidate();
        }
    }

    requestStrokePresentation() {
        if (this.presentationFrame !== null) {
            return;
        }
        this.presentationFrame = requestAnimationFrame(() => {
            this.presentationFrame = null;
            const dirtyBounds = this.presentStroke();
            if (dirtyBounds !== null && !dirtyBounds.isEmpty()) {
                this.getActiveLayer().invalidate(dirtyBounds);
            }
        });
    }

    presentStroke() {
        if (this.strokeSurface === null || this.pendingStrokeBounds === null) {
            return null;
        }

        const surface = this.getActiveLayer().getSurface();
        const dirtyBounds = Rectangle.intersect(
            Utility.roundRectangle(this.pendingStrokeBounds),
            surface.getBounds()
        );
        this.pendingStrokeBounds = null;
        if (dirtyBounds.isEmpty()) {
            return dirtyBounds;
        }

        // Paint.NET renders brush changes through a 256px tile cache. Canvas
        // does not expose that cache directly, but the same principle applies:
        // restore and re-composite only the pixels touched since the last frame.
        // This avoids full-image copies for every pointer sample on large files.
        surface.copyRegionFromExact(this.scratchSurface, dirtyBounds);
        const destination = surface.context;
        destination.save();
        destination.beginPath();
        destination.rect(dirtyBounds.x, dirtyBounds.y, dirtyBounds.width, dirtyBounds.height);
        destination.clip();
        this.clipToSelection(destination);
        destination.globalCompositeOperation = this.erase
            ? "destination-out"
            : this.getCompositeOperation();
        destination.globalAlpha = this.getColor(this.button).alpha / 255;
        destination.drawImage(this.strokeSurface.canvas, 0, 0);
        destination.restore();
        return dirtyBounds;
    }

    drawSegment(from, to, fromPressure = 1, toPressure = fromPressure) {
        const surface = this.getActiveLayer().getSurface();
        const context = this.strokeSurface === null ? surface.context : this.strokeSurface.context;
        const width = this.getWidth();
        const antialiased = this.getSetting("antialias", true);
        const hardness = antialiased
            ? Utility.clamp(Number(this.getSetting("hardness", 100)), 0, 100) / 100
            : 1;
        const maxStampWidth = width * Math.max(fromPressure, toPressure);
        const stampExtent = this.getBrushStampExtent(maxStampWidth, hardness);
        const segmentBounds = Rectangle.absolute(
            Math.min(from.x, to.x), Math.min(from.y, to.y),
            Math.max(from.x, to.x) + 1, Math.max(from.y, to.y) + 1
        );
        segmentBounds.inflate(Math.ceil(stampExtent) + 1, Math.ceil(stampExtent) + 1);
        // A sampled stroke already has a complete snapshot from mouse-down.
        // Saving individual tiles again would overwrite that baseline with
        // pixels from an intermediate presentation of the same stroke.
        if (!this.bitmapTransaction.fullSnapshot) {
            this.saveRegion(null, segmentBounds);
        }
        context.save();
        context.globalCompositeOperation = "source-over";
        const strokeColor = this.getColor(this.button);
        const strokeBackground = this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT);
        // The sampled surface stores coverage, not the final per-dab alpha.
        // Otherwise every short input segment blends its translucent round cap
        // over the previous one and exposes the individual brush circles.
        const coverageColor = this.strokeSurface === null
            ? strokeColor
            : new Color(strokeColor.red, strokeColor.green, strokeColor.blue, 255);
        const coverageBackground = this.strokeSurface === null
            ? strokeBackground
            : new Color(strokeBackground.red, strokeBackground.green, strokeBackground.blue, 255);
        context.strokeStyle = this.createFillStyle(context, coverageColor, coverageBackground);
        context.fillStyle = context.strokeStyle;
        context.lineWidth = width * ((fromPressure + toPressure) / 2);
        context.lineCap = "round";
        context.lineJoin = "round";
        // Paint.NET clamps sampled-brush spacing to one device pixel. Using a
        // half-pixel minimum makes small soft brushes stamp twice as often and
        // compounds their translucent centers until every hardness looks solid.
        const spacing = Math.max(1, width * Number(this.getSetting("spacing", 15)) / 100);
        const coordinateOffset = this.usesContinuousPointerCoordinates() ? 0 : 0.5;
        const color = coverageColor;
        const distance = Math.max(0, Utility.distance(from, to));
        const offsets = [];
        if (!this.sampledStroke) {
            const steps = Math.max(1, Math.ceil(distance / spacing));
            for (let i = 0; i <= steps; ++i) {
                offsets.push(distance * i / steps);
            }
        } else if (!this.hasStrokeSample) {
            offsets.push(0);
            this.hasStrokeSample = true;
        }
        if (distance > 0) {
            let offset = this.hasStrokeSample
                ? spacing - this.distanceSinceLastSample
                : 0;
            let lastOffset = null;
            while (offset <= distance + 1e-6) {
                offsets.push(Math.min(offset, distance));
                lastOffset = offset;
                offset += spacing;
            }
            this.distanceSinceLastSample = lastOffset === null
                ? this.distanceSinceLastSample + distance
                : Math.max(0, distance - lastOffset);
            this.hasStrokeSample = true;
        }
        for (const offset of offsets) {
            const t = distance === 0 ? 0 : offset / distance;
            const px = from.x + (to.x - from.x) * t + coordinateOffset;
            const py = from.y + (to.y - from.y) * t + coordinateOffset;
            const stampWidth = width * (fromPressure + (toPressure - fromPressure) * t);
            if (antialiased) {
                this.drawBrushStamp(context, px, py, width, stampWidth,
                    hardness, color);
            } else {
                context.fillStyle = this.createFillStyle(context, color,
                    coverageBackground);
                this.drawAliasedBrushStamp(context, px, py, stampWidth);
            }
        }
        context.restore();

        this.changedBounds = Rectangle.union(this.changedBounds, segmentBounds);
        this.markBitmapTransactionDirty(this.changedBounds);
        if (this.strokeSurface !== null) {
            const clippedSegmentBounds = Rectangle.intersect(segmentBounds, surface.getBounds());
            this.pendingStrokeBounds = this.pendingStrokeBounds === null
                ? clippedSegmentBounds
                : Rectangle.union(this.pendingStrokeBounds, clippedSegmentBounds);
        } else {
            this.getActiveLayer().invalidate(Rectangle.intersect(segmentBounds, surface.getBounds()));
        }
    }

    getBrushStampExtent(stampWidth, hardness) {
        const radius = Math.max(0.5, stampWidth / 2);
        if (hardness >= 0.999) {
            return radius;
        }
        return this.getBrushStampProfile(radius, hardness).extentRadius;
    }

    getBrushStampProfile(radius, hardness) {
        // Paint.NET 5's BasicSampledBrushRenderer uses a hard shape whose
        // diameter interpolates from 59.4375% to 100%, then blurs it in linear
        // light and converts the result back to sRGB. A 2D blurred disc is not
        // the same profile as a blurred 1D edge, especially near its center.
        const coreRadius = radius * (0.594375 + 0.405625 * hardness);
        const blurRadius = radius * (1 - hardness);
        const cacheKey = Math.round(hardness * 10000);
        let alphaStops = this.brushProfileCache.get(cacheKey);
        if (alphaStops === undefined) {
            alphaStops = this.createBrushProfileAlphaStops(hardness);
            this.brushProfileCache.set(cacheKey, alphaStops);
        }
        return {
            radius,
            coreRadius,
            extentRadius: coreRadius + blurRadius,
            alphaStops
        };
    }

    drawBrushStamp(context, x, y, brushWidth, stampWidth, hardness, color) {
        const sprite = this.getBrushSprite(brushWidth, hardness, color);

        // BasicSampledBrushRenderer clamps the rendered diameter to one pixel,
        // then preserves the area of a sub-pixel pressure dab through opacity.
        const renderedDiameter = Math.max(1, stampWidth);
        const opacity = stampWidth < 1 ? stampWidth * stampWidth : 1;
        const scale = renderedDiameter / sprite.renderDiameter;
        const destinationWidth = sprite.canvas.width * scale;
        const destinationHeight = sprite.canvas.height * scale;

        context.save();
        context.globalAlpha *= opacity;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
            sprite.canvas,
            x - destinationWidth / 2,
            y - destinationHeight / 2,
            destinationWidth,
            destinationHeight
        );
        context.restore();
    }

    drawAliasedBrushStamp(context, x, y, stampWidth) {
        // This mirrors BasicSampledBrushRenderer's aliased branch. Canvas has
        // no vector antialias switch, so rasterize the ellipse as whole pixels
        // instead of using arc()/fill(), which always produces soft coverage.
        const diameter = Math.round(stampWidth * 2) / 2;
        if (diameter < 1.5) {
            context.fillRect(Math.round(x), Math.round(y), 1, 1);
            return;
        }

        const left = Math.round(x - diameter / 2);
        const top = Math.round(y - diameter / 2);
        const right = Math.ceil(left + diameter);
        const bottom = Math.ceil(top + diameter);
        const radius = diameter / 2;
        const centerX = left + radius;
        const centerY = top + radius;
        for (let py = top; py < bottom; ++py) {
            const ny = (py + 0.5 - centerY) / radius;
            for (let px = left; px < right; ++px) {
                const nx = (px + 0.5 - centerX) / radius;
                if (nx * nx + ny * ny <= 1) {
                    context.fillRect(px, py, 1, 1);
                }
            }
        }
    }

    getBrushSprite(brushWidth, hardness, color) {
        // Paint.NET's BasicSampledBrushRenderer creates its source bitmap at a
        // minimum diameter of 32px and scales that bitmap for every sample.
        // This supersampling is especially important for 1-3px curved lines:
        // drawing the gradient at final size discards nearly all edge shades.
        const renderDiameter = Math.max(32, brushWidth);
        const cacheKey = [
            Math.round(renderDiameter * 1000),
            Math.round(hardness * 10000),
            color.red, color.green, color.blue, color.alpha
        ].join(":");
        let sprite = this.brushSpriteCache.get(cacheKey);
        if (sprite !== undefined) {
            return sprite;
        }

        const profile = this.getBrushStampProfile(renderDiameter / 2, hardness);
        let spriteSize = Math.ceil(profile.extentRadius * 2) + 2;
        // Paint.NET measures an inflated, odd-sized bitmap around the center.
        if ((spriteSize & 1) === 0) {
            ++spriteSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const spriteContext = canvas.getContext("2d", {alpha: true});
        const center = spriteSize / 2;
        const gradient = spriteContext.createRadialGradient(
            center, center, 0, center, center, profile.extentRadius);
        const steps = profile.alphaStops.length - 1;
        for (let step = 0; step <= steps; ++step) {
            const alpha = step === steps ? 0 : profile.alphaStops[step];
            gradient.addColorStop(step / steps,
                `rgba(${color.red},${color.green},${color.blue},${alpha * color.alpha / 255})`);
        }
        spriteContext.fillStyle = gradient;
        spriteContext.fillRect(0, 0, spriteSize, spriteSize);

        sprite = {canvas, renderDiameter};
        this.brushSpriteCache.set(cacheKey, sprite);
        return sprite;
    }

    getBrushProfileAlpha(distance, profile) {
        const position = distance / profile.extentRadius * (profile.alphaStops.length - 1);
        const index = Math.min(profile.alphaStops.length - 1, Math.floor(position));
        const nextIndex = Math.min(profile.alphaStops.length - 1, index + 1);
        const fraction = position - index;
        return profile.alphaStops[index]
            + (profile.alphaStops[nextIndex] - profile.alphaStops[index]) * fraction;
    }

    createBrushProfileAlphaStops(hardness) {
        // The native renderer keeps the intermediate in float32. More stops
        // prevent the cached canvas gradient from quantizing that profile
        // before the high-quality reduction to document pixels.
        const stopCount = 128;
        const stops = new Array(stopCount + 1);
        const coreRadius = 0.594375 + 0.405625 * hardness;
        const blurRadius = 1 - hardness;
        const extentRadius = coreRadius + blurRadius;
        const sigma = blurRadius / 3;

        if (sigma <= 0.0001) {
            for (let i = 0; i <= stopCount; ++i) {
                stops[i] = i < stopCount ? 1 : 0;
            }
            return stops;
        }

        // Integrate a normalized 2D Gaussian over the circular hard core.
        // Midpoint sampling in sigma-space is stable for every brush size,
        // because the complete profile scales with the requested radius.
        const sampleCount = 65;
        const support = 3;
        const samples = [];
        let totalWeight = 0;
        for (let yIndex = 0; yIndex < sampleCount; ++yIndex) {
            const y = -support + (yIndex + 0.5) * support * 2 / sampleCount;
            for (let xIndex = 0; xIndex < sampleCount; ++xIndex) {
                const x = -support + (xIndex + 0.5) * support * 2 / sampleCount;
                const weight = Math.exp(-(x * x + y * y) / 2);
                samples.push({x, y, weight});
                totalWeight += weight;
            }
        }

        for (let i = 0; i <= stopCount; ++i) {
            if (i === stopCount) {
                stops[i] = 0;
                continue;
            }
            const distance = extentRadius * i / stopCount;
            let coveredWeight = 0;
            for (const sample of samples) {
                const x = distance + sample.x * sigma;
                const y = sample.y * sigma;
                if (x * x + y * y <= coreRadius * coreRadius) {
                    coveredWeight += sample.weight;
                }
            }
            const linearCoverage = Utility.clamp(coveredWeight / totalWeight, 0, 1);
            stops[i] = 1 - this.linearToSrgb(1 - linearCoverage);
        }
        return stops;
    }

    linearToSrgb(value) {
        value = Utility.clamp(value, 0, 1);
        return value <= 0.0031308
            ? value * 12.92
            : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    }

    clipToSelection(context) {
        const selection = this.getSelection();
        if (selection.isEmpty()) {
            return;
        }
        const path = selection.createPath();
        context.beginPath();
        for (const list of path.getVertexLists()) {
            const points = list.getVertices();
            if (points.length === 0) {
                continue;
            }
            context.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; ++i) {
                context.lineTo(points[i].x, points[i].y);
            }
            context.closePath();
        }
        context.clip("evenodd");
        path.dispose();
    }

    getClippedChangedBounds() {
        return Rectangle.intersect(this.changedBounds, this.getActiveLayer().getBounds());
    }
}
