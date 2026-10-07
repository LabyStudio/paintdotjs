class EllipseSelectTool extends SelectionTool {

    constructor(type) {
        super(type);
    }

    onActivate() {
        super.onActivate();
    }

    trimShapePath(tracePoints) {
        let array = [];

        if (tracePoints.length > 0) {
            array.push(tracePoints[0]);

            if (tracePoints.length > 1) {
                array.push(tracePoints[tracePoints.length - 1]);
            }
        }

        return array;
    }

    createShape(tracePoints) {
        let a = tracePoints[0];
        let b = tracePoints[tracePoints.length - 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy);

        let bounds;

        if (this.app.isShiftKeyDown()) {
            // Paint.NET uses the two pointer positions as opposite ends of a
            // diameter. Keep the fractional center/radius; rounding here moves
            // the circle away from both the press and release positions.
            const centerX = (a.x + b.x) / 2;
            const centerY = (a.y + b.y) / 2;
            const radius = length / 2;
            bounds = new Rectangle(
                centerX - radius,
                centerY - radius,
                radius * 2,
                radius * 2
            );
        } else {
            // FromPixelPoints includes both integer pixels, so dragging from
            // x=10 to x=20 produces the same 11-pixel bounds as Paint.NET.
            bounds = Utility.pointsToRectangle(a, b);
        }

        return this.flattenEllipse(bounds, 0.01);
    }

    flattenEllipse(bounds, tolerance) {
        if (bounds.getWidth() <= 0 || bounds.getHeight() <= 0) return [];

        const radiusX = bounds.getWidth() / 2;
        const radiusY = bounds.getHeight() / 2;
        const centerX = bounds.getLeft() + radiusX;
        const centerY = bounds.getTop() + radiusY;
        const maxRadius = Math.max(radiusX, radiusY);

        // Choose enough straight segments that their maximum deviation from
        // the true ellipse is at most the same 0.01px flattening tolerance v5
        // requests from Direct2D.
        const cosine = Utility.clamp(1 - tolerance / maxRadius, -1, 1);
        const requiredSegments = Math.ceil(Math.PI / Math.acos(cosine));
        const segments = Math.max(16, Math.ceil(requiredSegments / 4) * 4);
        const points = new Array(segments + 1);
        for (let i = 0; i <= segments; ++i) {
            const angle = i * Math.PI * 2 / segments;
            points[i] = new Point(
                centerX + radiusX * Math.cos(angle),
                centerY + radiusY * Math.sin(angle)
            );
        }
        return points;
    }

    getCursorImgUp() {
        return "ellipse_select_tool_cursor";
    }

    getCursorImgDown() {
        return "ellipse_select_tool_mouse_down_cursor";
    }

    getCursorImgUpPlus() {
        return "ellipse_select_tool_plus_cursor";
    }

    getCursorImgUpMinus() {
        return "ellipse_select_tool_minus_cursor";
    }

}
