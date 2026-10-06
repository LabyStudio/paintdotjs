class MaskedSurface {

    constructor(surface, path) {
        if (!(surface instanceof Surface) || !(path instanceof GraphicsPath)) {
            throw new Error("MaskedSurface requires a Surface and GraphicsPath");
        }

        this.path = path.clone();
        this.shadowPath = path.clone();
        this.disposed = false;
        this.linearSurface = null;

        const pathBounds = path.getBounds();
        this.bounds = Rectangle.intersect(
            Rectangle.absolute(
                Math.floor(pathBounds.getLeft()),
                Math.floor(pathBounds.getTop()),
                Math.ceil(pathBounds.getRight()),
                Math.ceil(pathBounds.getBottom())
            ),
            surface.getBounds()
        );

        if (this.bounds.isEmpty()) {
            this.surface = null;
            return;
        }

        this.surface = Surface.create(this.bounds.width, this.bounds.height);
        const context = this.surface.context;
        context.save();
        context.translate(-this.bounds.x, -this.bounds.y);
        this.tracePath(context, path);
        context.clip("evenodd");
        context.drawImage(surface.canvas, 0, 0);
        context.restore();
    }

    tracePath(context, path) {
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

    eraseFrom(targetSurface) {
        if (this.surface === null) return;
        if (typeof targetSurface.getSurface === "function") targetSurface = targetSurface.getSurface();
        const context = targetSurface.context;
        context.save();
        context.globalCompositeOperation = "destination-out";
        context.drawImage(this.surface.canvas, this.bounds.x, this.bounds.y);
        context.restore();
    }

    render(targetSurface, transform, sampling, gammaCorrected = false) {
        if (this.disposed) throw new Error("MaskedSurface has been disposed");
        if (this.surface === null || !transform.isInvertible()) return;

        if (typeof targetSurface.getSurface === "function") targetSurface = targetSurface.getSurface();
        const m = transform.getElements();
        if (gammaCorrected && sampling !== ResamplingAlgorithm.NEAREST_NEIGHBOR) {
            this.renderGammaCorrected(targetSurface, transform, sampling);
            return;
        }
        const context = targetSurface.context;
        context.save();
        context.imageSmoothingEnabled = sampling !== ResamplingAlgorithm.NEAREST_NEIGHBOR;
        context.imageSmoothingQuality = this.getCanvasSmoothingQuality(sampling);
        context.setTransform(m[0][0], m[1][0], m[0][1], m[1][1], m[0][2], m[1][2]);
        context.drawImage(this.surface.canvas, this.bounds.x, this.bounds.y);
        context.restore();
    }

    renderGammaCorrected(targetSurface, transform, sampling) {
        const source = this.getLinearSurface();

        const corners = [
            new Point(this.bounds.getLeft(), this.bounds.getTop()),
            new Point(this.bounds.getRight(), this.bounds.getTop()),
            new Point(this.bounds.getRight(), this.bounds.getBottom()),
            new Point(this.bounds.getLeft(), this.bounds.getBottom())
        ];
        transform.transformPoints(corners);
        const bounds = Rectangle.intersect(Utility.roundRectangle(Rectangle.absolute(
            Math.min(...corners.map(point => point.x)) - 2,
            Math.min(...corners.map(point => point.y)) - 2,
            Math.max(...corners.map(point => point.x)) + 2,
            Math.max(...corners.map(point => point.y)) + 2
        )), targetSurface.getBounds());
        if (bounds.isEmpty()) {
            return;
        }
        const rendered = Surface.create(bounds.width, bounds.height);
        const m = transform.getElements();
        rendered.context.imageSmoothingEnabled = true;
        rendered.context.imageSmoothingQuality = this.getCanvasSmoothingQuality(sampling);
        rendered.context.setTransform(m[0][0], m[1][0], m[0][1], m[1][1],
            m[0][2] - bounds.x, m[1][2] - bounds.y);
        rendered.context.drawImage(source.canvas, this.bounds.x, this.bounds.y);

        const output = rendered.context.getImageData(0, 0, rendered.width, rendered.height);
        const toSrgb = MaskedSurface.getToSrgbLut();
        for (let i = 0; i < output.data.length; i += 4) {
            if (output.data[i + 3] === 0) continue;
            output.data[i] = toSrgb[output.data[i]];
            output.data[i + 1] = toSrgb[output.data[i + 1]];
            output.data[i + 2] = toSrgb[output.data[i + 2]];
        }
        rendered.context.setTransform(1, 0, 0, 1, 0, 0);
        rendered.context.putImageData(output, 0, 0);
        targetSurface.context.drawImage(rendered.canvas, bounds.x, bounds.y);
        rendered.dispose();
    }

    getLinearSurface() {
        if (this.linearSurface !== null) return this.linearSurface;
        this.linearSurface = this.surface.clone();
        const pixels = this.linearSurface.context.getImageData(
            0, 0, this.linearSurface.width, this.linearSurface.height
        );
        const toLinear = MaskedSurface.getToLinearLut();
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i] = toLinear[pixels.data[i]];
            pixels.data[i + 1] = toLinear[pixels.data[i + 1]];
            pixels.data[i + 2] = toLinear[pixels.data[i + 2]];
        }
        this.linearSurface.context.putImageData(pixels, 0, 0);
        return this.linearSurface;
    }

    static getToLinearLut() {
        if (MaskedSurface.toLinearLut === undefined) {
            MaskedSurface.toLinearLut = Uint8ClampedArray.from({length: 256}, (_, value) => {
                const normalized = value / 255;
                const linear = normalized <= 0.04045
                    ? normalized / 12.92
                    : Math.pow((normalized + 0.055) / 1.055, 2.4);
                return Math.round(linear * 255);
            });
        }
        return MaskedSurface.toLinearLut;
    }

    static getToSrgbLut() {
        if (MaskedSurface.toSrgbLut === undefined) {
            MaskedSurface.toSrgbLut = Uint8ClampedArray.from({length: 256}, (_, value) => {
                const normalized = value / 255;
                const srgb = normalized <= 0.0031308
                    ? normalized * 12.92
                    : 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
                return Math.round(srgb * 255);
            });
        }
        return MaskedSurface.toSrgbLut;
    }

    getCanvasSmoothingQuality(sampling) {
        // Canvas 2D exposes the same nearest/linear family through its native
        // resampler, with three quality tiers. Map Paint.NET's Direct2D modes
        // onto those tiers while retaining every user-facing v5 mode.
        switch (sampling) {
            case ResamplingAlgorithm.LINEAR:
                return "low";
            case ResamplingAlgorithm.MULTISAMPLE_LINEAR:
                return "medium";
            case ResamplingAlgorithm.ANISOTROPIC:
            case ResamplingAlgorithm.HIGH_QUALITY_CUBIC:
                return "high";
            default:
                return "low";
        }
    }

    clone() {
        const clone = Object.create(MaskedSurface.prototype);
        clone.path = this.path === null ? null : this.path.clone();
        clone.shadowPath = this.shadowPath === null ? null : this.shadowPath.clone();
        clone.bounds = this.bounds.clone();
        clone.surface = this.surface === null ? null : this.surface.clone();
        clone.linearSurface = this.linearSurface === null ? null : this.linearSurface.clone();
        clone.disposed = false;
        return clone;
    }

    dispose() {
        if (this.surface !== null) this.surface.dispose();
        if (this.linearSurface !== null) this.linearSurface.dispose();
        if (this.path !== null) this.path.dispose();
        if (this.shadowPath !== null) this.shadowPath.dispose();
        this.surface = null;
        this.linearSurface = null;
        this.path = null;
        this.shadowPath = null;
        this.disposed = true;
    }
}
