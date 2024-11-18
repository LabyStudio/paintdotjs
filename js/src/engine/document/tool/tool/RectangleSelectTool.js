class RectangleSelectTool extends SelectionTool {

    constructor() {
        super(ToolType.RECTANGLE_SELECT);
    }

    onActivate() {
        super.onActivate();
    }

    trimShapePath(trimTheseTracePoints) {
        let array = [];

        if (trimTheseTracePoints.length > 0) {
            array.push(trimTheseTracePoints[0]);

            if (trimTheseTracePoints.length > 1) {
                array.push(trimTheseTracePoints[trimTheseTracePoints.length - 1]);
            }
        }

        return array;
    }

    createShape(shapePoints) {
        let a = shapePoints[0];
        let b = shapePoints[shapePoints.length - 1];

        let isShiftKeyDown = false; // TODO shift key handling

        let rect;
        if (isShiftKeyDown) {
            rect = Utility.pointsToConstrainedRectangle(a, b);
        } else {
            rect = Utility.pointsToRectangle(a, b);
        }

        rect.intersect(this.getDocumentWorkspace().getDocument().getBounds());

        let shape = [];

        if (rect.getWidth() > 0 && rect.getHeight() > 0) {
            shape = [];

            shape.push(new Point(rect.getLeft(), rect.getTop()));
            shape.push(new Point(rect.getRight(), rect.getTop()));
            shape.push(new Point(rect.getRight(), rect.getBottom()));
            shape.push(new Point(rect.getLeft(), rect.getBottom()));
            shape.push(shape[0]);
        } else {
            shape = [];
        }

        return shape;
    }

    getCursorImgUp() {
        return "rectangle_select_tool_cursor";
    }

    getCursorImgDown() {
        return "rectangle_select_tool_mouse_down_cursor";
    }

    getCursorImgUpPlus() {
        return "rectangle_select_tool_plus_cursor";
    }

    getCursorImgUpMinus() {
        return "rectangle_select_tool_minus_cursor";
    }

}