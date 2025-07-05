class MaskedSurface {

    // Constants that define fixed-point precision and arithmetic
    static FP_SHIFT_FACTOR = 14;
    static FP_MULTI_FACTOR = (1 << MaskedSurface.FP_SHIFT_FACTOR);
    static FP_MAX_VALUE = ((1 << (31 - MaskedSurface.FP_SHIFT_FACTOR)) - 1);
    static FP_ROUND_FACTOR = ((1 << MaskedSurface.FP_SHIFT_FACTOR) >> 1) - 1;

    constructor(surface, path) {
        this.path = null;
        this.shadowPath = null;
        this.disposed = false;

        let bounds = Utility.roundRectangle(path.getBounds());

        let boundsClipped = Rectangle.intersect(bounds, surface.getBounds());
        let boundsRead;

        if (bounds !== boundsClipped) {
            let region = Region.fromPath(path);
            region.intersectRectangle(surface.getBounds());
            this.setPathField(GraphicsPath.fromRegion(region));
            this.region = region;
            boundsRead = region.getBounds(); // TODO getBoundsInt
        } else {
            this.setPathField(path.clone());
            this.region = Region.fromPath(this.path);
            boundsRead = boundsClipped;
        }

        if (boundsRead.width > 0 && boundsRead.height > 0) {
            this.surface = Surface.create(boundsRead.width, boundsRead.height);
            this.surface.copySurfaceRectangle(surface, boundsRead);
        } else {
            this.surface = null;
        }
    }

    render(targetSurface, transform, sampling) {
        if (this.disposed) {
            throw new Error("MaskedSurface has been disposed");
        }

        if (this.surface === null || !transform.isInvertible()) {
            return;
        }

        let theRegion;
        let regionBounds;

        if (this.path === null) {
            theRegion = this.region.clone();
            regionBounds = this.region.getBounds(); // TODO getBoundsInt
            theRegion.transform(transform);
        } else {
            let mPath = this.shadowPath.clone();
            regionBounds = Rectangle.truncate(mPath.getBounds());
            mPath.transform(transform);
            theRegion = Region.fromPath(mPath);
        }

        let dc = new DrawContext();

        dc.boundsX = regionBounds.x;
        dc.boundsY = regionBounds.y;

        let inverse = transform.clone();
        inverse.invert();

        dc.inverses = new Array(Processor.LOGICAL_CPU_COUNT);
        for (let i = 0; i < dc.inverses.length; ++i) {
            dc.inverses[i] = inverse.clone();
        }

        // change in source-[X|Y] w.r.t. destination-[X|Y]
        let pts = [
            new Point(1, 0),
            new Point(0, 1)
        ];
        inverse.transformVectors(pts);
        inverse.dispose();
        inverse = null;

        dc.dsxddx = pts[0].x;
        if (Math.abs(dc.dsxddx) > MaskedSurface.FP_MAX_VALUE) {
            dc.dsxddx = 0.0;
        }
        dc.dsyddx = pts[0].y;
        if (Math.abs(dc.dsyddx) > MaskedSurface.FP_MAX_VALUE) {
            dc.dsyddx = 0.0;
        }
        dc.dsxddy = pts[1].x;
        if (Math.abs(dc.dsxddy) > MaskedSurface.FP_MAX_VALUE) {
            dc.dsxddy = 0.0;
        }
        dc.dsyddy = pts[1].y;
        if (Math.abs(dc.dsyddy) > MaskedSurface.FP_MAX_VALUE) {
            dc.dsyddy = 0.0;
        }

        dc.fp_dsxddx = Math.round(dc.dsxddx * MaskedSurface.FP_MULTI_FACTOR);
        dc.fp_dsyddx = Math.round(dc.dsyddx * MaskedSurface.FP_MULTI_FACTOR);
        dc.fp_dsxddy = Math.round(dc.dsxddy * MaskedSurface.FP_MULTI_FACTOR);
        dc.fp_dsyddy = Math.round(dc.dsyddy * MaskedSurface.FP_MULTI_FACTOR);

        dc.dst = targetSurface;
        dc.src = this.surface;

        let scans = theRegion.getRectangles(); // TODO getRegionScansReadOnlyInt
        if (scans.length === 1) {
            dc.dstScans = new Array(Processor.LOGICAL_CPU_COUNT);
            Utility.splitRectangle(scans[0], dc.dstScans);
        } else {
            dc.dstScans = scans;
        }

        let wc;

        switch (sampling) {
            case ResamplingAlgorithm.NEAREST_NEIGHBOR:
                wc = dc.drawScansNearestNeighbor;
                break;
            case ResamplingAlgorithm.BILINEAR:
                wc = dc.drawScansBilinear;
                break;
            default:
                throw new Error("Invalid resampling algorithm");
        }

        for (let i = 0; i < Processor.LOGICAL_CPU_COUNT; ++i) {
            if (i === Processor.LOGICAL_CPU_COUNT - 1) {
                // Don't queue the last work item into a separate thread
                wc.call(dc, i);
            } else {
                // TODO Implement a thread pool or worker system
                wc.call(dc, i); // Simulate immediate execution for now
            }
        }

        for (let i = 0; i < Processor.LOGICAL_CPU_COUNT; ++i) {
            dc.inverses[i].dispose();
            dc.inverses[i] = null;
        }

        dc.src = null;

        theRegion.dispose();
        theRegion = null;
    }

    setPathField(path) {
        this.path = path;
        this.shadowPath = path.clone();
    }

    dispose() {
        if (this.maskedSurface !== null) {
            this.maskedSurface.dispose();
            this.maskedSurface = null;
        }

        this.disposed = true;
    }
}

class DrawContext {

    constructor() {
        this.boundsX = 0;
        this.boundsY = 0;
        this.inverses = [];
        this.dsxddx = 0;
        this.dsyddx = 0;
        this.dsxddy = 0;
        this.dsyddy = 0;
    }

    drawScansNearestNeighbor(cpuNumber) {
        const inc = Processor.LOGICAL_CPU_COUNT;
        const pts = [new Point(0, 0)];

        for (let i = cpuNumber; i < this.dstScans.length; i += inc) {
            const dstRect = this.dstScans[i];
            dstRect.intersect(this.dst.getBounds());

            const dstW = dstRect.getWidth();
            const dstH = dstRect.getHeight();
            if (dstW === 0 || dstH === 0) {
                continue;
            }

            // Get entire destination image data once
            const dstImageData = this.dst.surface.context.getImageData(dstRect.getLeft(), dstRect.getTop(), dstW, dstH);
            const dstBuffer = dstImageData.data; // Uint8ClampedArray

            // Also optionally get source image data buffer (once)
            const srcImageData = this.src.context.getImageData(0, 0, this.src.getWidth(), this.src.getHeight());
            const srcBuffer = srcImageData.data;
            const srcWidth = this.src.getWidth();
            const srcHeight = this.src.getHeight();

            pts[0].x = dstRect.getLeft();
            pts[0].y = dstRect.getTop();
            this.inverses[cpuNumber].transformPoints(pts);
            pts[0].x -= this.boundsX;
            pts[0].y -= this.boundsY;

            let fp_srcPtRowX = Math.round(pts[0].x * MaskedSurface.FP_MULTI_FACTOR);
            let fp_srcPtRowY = Math.round(pts[0].y * MaskedSurface.FP_MULTI_FACTOR);

            for (let y = 0; y < dstH; ++y) {
                let fp_srcPtColX = fp_srcPtRowX;
                let fp_srcPtColY = fp_srcPtRowY;
                fp_srcPtRowX += this.fp_dsxddy;
                fp_srcPtRowY += this.fp_dsyddy;

                for (let x = 0; x < dstW; ++x) {
                    const dstIndex = (y * dstW + x) * 4;

                    const srcPtColX = (fp_srcPtColX + MaskedSurface.FP_ROUND_FACTOR) >> MaskedSurface.FP_SHIFT_FACTOR;
                    const srcPtColY = (fp_srcPtColY + MaskedSurface.FP_ROUND_FACTOR) >> MaskedSurface.FP_SHIFT_FACTOR;

                    const srcX = Utility.clamp(srcPtColX, 0, srcWidth - 1);
                    const srcY = Utility.clamp(srcPtColY, 0, srcHeight - 1);
                    const srcIndex = (srcY * srcWidth + srcX) * 4;

                    dstBuffer[dstIndex] = srcBuffer[srcIndex];       // R
                    dstBuffer[dstIndex + 1] = srcBuffer[srcIndex + 1]; // G
                    dstBuffer[dstIndex + 2] = srcBuffer[srcIndex + 2]; // B
                    dstBuffer[dstIndex + 3] = srcBuffer[srcIndex + 3]; // A

                    fp_srcPtColX += this.fp_dsxddx;
                    fp_srcPtColY += this.fp_dsyddx;
                }
            }

            // Write updated image back in one go
            this.dst.surface.context.putImageData(dstImageData, dstRect.getLeft(), dstRect.getTop());
        }
    }

    drawScansBilinear() {
        throw new Error("Bilinear resampling not implemented yet");
    }


}