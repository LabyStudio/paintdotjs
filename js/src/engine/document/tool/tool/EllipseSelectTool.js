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
        let dir = new Point(b.x - a.x, b.y - a.y);
        let len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);

        let rectF;

        if (this.app.isShiftKeyDown()) {
            let center = new Point((a.x + b.x) / 2.0, (a.y + b.y) / 2.0);
            let radius = len / 2;
            rectF = Rectangle.truncate(Utility.rectangleFromCenter(center, radius));
        } else {
            rectF = Utility.pointsToRectangle(a, b);
        }

        let rect = Utility.roundRectangle(rectF);
        let path = new GraphicsPath();
        path.addEllipse(rect);

        // Avoid asymmetrical circles where the left or right side of the ellipse has a pixel jutting out
        let m = new Matrix();
        m.reset();
        m.translate(-0.5, -0.5, MatrixOrder.APPEND);
        path.transform(m);

        path.flatten(Utility.identityMatrix, 0.1);

        let pointsF = path.getPathPoints();
        path.dispose();

        return pointsF;
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