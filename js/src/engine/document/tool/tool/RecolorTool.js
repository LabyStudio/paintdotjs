class RecolorTool extends DrawingTool {
    constructor(type) {
        super(type, 20, false);
        this.strokeTarget = null;
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("recolor_tool_cursor");
    }

    onMouseDown(x, y, button) {
        if (this.getSetting("recolorSampling", "once") === "once") {
            const surface = this.getActiveLayer().getSurface();
            const px = Math.floor(x), py = Math.floor(y);
            if (px >= 0 && py >= 0 && px < surface.width && py < surface.height) {
                this.strokeTarget = surface.getColorAt(px, py);
            }
        } else {
            this.strokeTarget = null;
        }
        return super.onMouseDown(x, y, button);
    }

    drawSegment(from, to, fromPressure = 1, toPressure = fromPressure) {
        const surface = this.getActiveLayer().getSurface();
        const pressure = Math.max(fromPressure, toPressure);
        const radius = this.getWidth() * pressure / 2;
        const tolerance = this.getToleranceThreshold();
        const bounds = Rectangle.absolute(
            Math.floor(Math.min(from.x, to.x) - radius), Math.floor(Math.min(from.y, to.y) - radius),
            Math.ceil(Math.max(from.x, to.x) + radius + 1), Math.ceil(Math.max(from.y, to.y) + radius + 1)
        );
        const clipped = Rectangle.intersect(bounds, surface.getBounds());
        if (clipped.isEmpty()) return;
        this.saveRegion(null, clipped);
        const pixels = surface.context.getImageData(clipped.x, clipped.y, clipped.width, clipped.height);
        const targetColor = this.strokeTarget
            || this.getColor(this.button === MouseButton.LEFT ? MouseButton.RIGHT : MouseButton.LEFT);
        const target = [targetColor.red, targetColor.green, targetColor.blue, targetColor.alpha];
        const replacement = this.getColor(this.button);
        const hardness = this.getSetting("antialias", true)
            ? Utility.clamp(Number(this.getSetting("hardness", 100)), 0, 100) / 100
            : 1;
        const premultiplied = this.getSetting("alphaMode", "premultiplied") === "premultiplied";
        const segmentLength = Utility.distance(from, to);
        const spacing = Math.max(0.5, this.getWidth() * Number(this.getSetting("spacing", 15)) / 100);
        const stampCount = Math.max(1, Math.ceil(segmentLength / spacing));
        for (let py = 0; py < clipped.height; ++py) {
            for (let px = 0; px < clipped.width; ++px) {
                const docX = clipped.x + px, docY = clipped.y + py;
                let distance = this.distanceToSegment(docX, docY, from, to);
                if (spacing > this.getWidth() * 0.25 && segmentLength > 0) {
                    const projection = Utility.clamp(
                        ((docX - from.x) * (to.x - from.x) + (docY - from.y) * (to.y - from.y))
                        / (segmentLength * segmentLength), 0, 1
                    );
                    const stamp = Math.round(projection * stampCount) / stampCount;
                    distance = Math.hypot(
                        docX - (from.x + (to.x - from.x) * stamp),
                        docY - (from.y + (to.y - from.y) * stamp)
                    );
                }
                if (distance > radius) continue;
                const i = (py * clipped.width + px) * 4;
                if (this.matchesColorTolerance(pixels.data, i, target, tolerance, premultiplied)) {
                    const hardRadius = radius * hardness;
                    const strength = distance <= hardRadius || hardRadius >= radius
                        ? 1
                        : 1 - (distance - hardRadius) / Math.max(0.0001, radius - hardRadius);
                    const shiftedRed = Utility.clamp(pixels.data[i] + replacement.red - target[0], 0, 255);
                    const shiftedGreen = Utility.clamp(pixels.data[i + 1] + replacement.green - target[1], 0, 255);
                    const shiftedBlue = Utility.clamp(pixels.data[i + 2] + replacement.blue - target[2], 0, 255);
                    const shiftedAlpha = Utility.clamp(pixels.data[i + 3] + replacement.alpha - target[3], 0, 255);
                    pixels.data[i] += (shiftedRed - pixels.data[i]) * strength;
                    pixels.data[i + 1] += (shiftedGreen - pixels.data[i + 1]) * strength;
                    pixels.data[i + 2] += (shiftedBlue - pixels.data[i + 2]) * strength;
                    pixels.data[i + 3] += (shiftedAlpha - pixels.data[i + 3]) * strength;
                }
            }
        }
        surface.context.putImageData(pixels, clipped.x, clipped.y);
        this.changedBounds = Rectangle.union(this.changedBounds, clipped);
        this.markBitmapTransactionDirty(this.changedBounds);
        this.getActiveLayer().invalidate(clipped);
    }

    distanceToSegment(x, y, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx === 0 && dy === 0) return Math.hypot(x - a.x, y - a.y);
        const t = Utility.clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
        return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
    }
}
