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
        if (this.tracking) this.commitStroke();
        super.onDeactivate();
    }

    onMouseDown(x, y, button, input = null) {
        if (button !== MouseButton.LEFT && button !== MouseButton.RIGHT) return false;
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
        if (this.strokeSurface !== null) this.requestStrokePresentation();
        return true;
    }

    onMouseMove(x, y, input = null) {
        if (!this.tracking) return false;
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
            if (point.equals(this.lastPoint)) continue;
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
        if (drewSample && this.strokeSurface !== null) this.requestStrokePresentation();
        return true;
    }

    onMouseUp(x, y, button, input = null) {
        if (!this.tracking || button !== this.button) return false;
        this.onMouseMove(x, y, input);
        this.commitStroke();
        return true;
    }

    getInputPressure(input) {
        if (!this.getSetting("pressure", false)) return 1;
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
        if (this.strokeSurface !== null) this.strokeSurface.dispose();
        this.strokeSurface = null;
        this.pendingStrokeBounds = null;
        // Rebuild the complete composition once at the end. Incremental updates
        // stay fast while drawing, while this final pass removes any scaled-view
        // seam at the dirty-region boundary.
        if (!changedBounds.isEmpty()) this.getActiveLayer().invalidate();
    }

    requestStrokePresentation() {
        if (this.presentationFrame !== null) return;
        this.presentationFrame = requestAnimationFrame(() => {
            this.presentationFrame = null;
            const dirtyBounds = this.presentStroke();
            if (dirtyBounds !== null && !dirtyBounds.isEmpty()) {
                this.getActiveLayer().invalidate(dirtyBounds);
            }
        });
    }

    presentStroke() {
        if (this.strokeSurface === null || this.pendingStrokeBounds === null) return null;

        const surface = this.getActiveLayer().getSurface();
        const dirtyBounds = Rectangle.intersect(
            Utility.roundRectangle(this.pendingStrokeBounds),
            surface.getBounds()
        );
        this.pendingStrokeBounds = null;
        if (dirtyBounds.isEmpty()) return dirtyBounds;

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
        const hardness = this.getSetting("antialias", true)
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
        const spacing = Math.max(0.5, width * Number(this.getSetting("spacing", 15)) / 100);
        const variablePressure = Math.abs(fromPressure - toPressure) > 0.01;
        const coordinateOffset = this.usesContinuousPointerCoordinates() ? 0 : 0.5;
        if (hardness >= 0.999 && spacing <= Math.max(1, width * 0.25)
            && !variablePressure) {
            context.beginPath();
            context.moveTo(from.x + coordinateOffset, from.y + coordinateOffset);
            context.lineTo(to.x + coordinateOffset, to.y + coordinateOffset);
            context.stroke();
            if (from.equals(to)) {
                context.beginPath();
                context.arc(from.x + coordinateOffset, from.y + coordinateOffset,
                    width * fromPressure / 2, 0, Math.PI * 2);
                context.fill();
            }
        } else {
            const color = coverageColor;
            const distance = Math.max(0, Utility.distance(from, to));
            const offsets = [];
            if (!this.sampledStroke) {
                const steps = Math.max(1, Math.ceil(distance / spacing));
                for (let i = 0; i <= steps; ++i) offsets.push(distance * i / steps);
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
                const radius = stampWidth / 2;
                if (hardness < 0.999) {
                    const profile = this.getBrushStampProfile(radius, hardness);
                    const gradient = context.createRadialGradient(
                        px, py, 0, px, py, profile.extentRadius);
                    const steps = 16;
                    for (let step = 0; step <= steps; ++step) {
                        const distance = profile.extentRadius * step / steps;
                        const alpha = step === steps
                            ? 0
                            : this.getBrushProfileAlpha(distance, profile);
                        gradient.addColorStop(step / steps,
                            `rgba(${color.red},${color.green},${color.blue},${alpha * color.alpha / 255})`);
                    }
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(px, py, profile.extentRadius, 0, Math.PI * 2);
                } else {
                    context.fillStyle = this.createFillStyle(context, color,
                        coverageBackground);
                    context.beginPath();
                    context.arc(px, py, radius, 0, Math.PI * 2);
                }
                context.fill();
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
        if (hardness >= 0.999) return radius;
        return this.getBrushStampProfile(radius, hardness).extentRadius;
    }

    getBrushStampProfile(radius, hardness) {
        // Paint.NET 5's BasicSampledBrushRenderer uses a hard shape whose
        // diameter interpolates from 59.4375% to 100%, then applies a Gaussian
        // blur whose radius interpolates from the full brush radius to zero.
        const coreRadius = radius * (0.594375 + 0.405625 * hardness);
        const blurRadius = radius * (1 - hardness);
        const sigma = Math.max(0.0001, blurRadius / 3);
        return {
            coreRadius,
            sigma,
            extentRadius: coreRadius + blurRadius,
            centerAlpha: this.gaussianEdgeAlpha(0, coreRadius, sigma)
        };
    }

    getBrushProfileAlpha(distance, profile) {
        return Utility.clamp(
            this.gaussianEdgeAlpha(distance, profile.coreRadius, profile.sigma)
                / profile.centerAlpha,
            0,
            1
        );
    }

    gaussianEdgeAlpha(distance, coreRadius, sigma) {
        return 0.5 * (1 - this.approximateErf(
            (distance - coreRadius) / (Math.SQRT2 * sigma)
        ));
    }

    approximateErf(value) {
        // Abramowitz and Stegun 7.1.26; accurate enough for an 8-bit mask.
        const sign = value < 0 ? -1 : 1;
        const x = Math.abs(value);
        const t = 1 / (1 + 0.3275911 * x);
        const polynomial = (((((1.061405429 * t - 1.453152027) * t)
            + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
        return sign * (1 - polynomial * Math.exp(-x * x));
    }

    clipToSelection(context) {
        const selection = this.getSelection();
        if (selection.isEmpty()) return;
        const path = selection.createPath();
        context.beginPath();
        for (const list of path.getVertexLists()) {
            const points = list.getVertices();
            if (points.length === 0) continue;
            context.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; ++i) context.lineTo(points[i].x, points[i].y);
            context.closePath();
        }
        context.clip("evenodd");
        path.dispose();
    }

    getClippedChangedBounds() {
        return Rectangle.intersect(this.changedBounds, this.getActiveLayer().getBounds());
    }
}
