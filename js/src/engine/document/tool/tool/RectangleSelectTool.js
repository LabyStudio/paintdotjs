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

class RectangleSelectTool extends SelectionTool {

    constructor(type) {
        super(type);
    }

    onActivate() {
        super.onActivate();
    }

    mustMoveForEmit() {
        return this.getSetting("selectionMode", "normal") !== "fixedSize";
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

        const mode = this.getSetting("selectionMode", "normal");
        let isShiftKeyDown = this.app.isShiftKeyDown();

        let rect;
        if (mode === "fixedSize") {
            const width = Number(this.getSetting("selectionWidth", 1));
            const height = Number(this.getSetting("selectionHeight", 1));
            const documentBounds = this.getDocumentWorkspace().getDocument().getBounds();
            rect = new Rectangle(
                Utility.clamp(b.x, documentBounds.getLeft(), Math.max(documentBounds.getLeft(), documentBounds.getRight() - width)),
                Utility.clamp(b.y, documentBounds.getTop(), Math.max(documentBounds.getTop(), documentBounds.getBottom() - height)),
                width, height
            );
        } else if (mode === "fixedRatio") {
            const ratioWidth = Math.max(1, Number(this.getSetting("selectionWidth", 1)));
            const ratioHeight = Math.max(1, Number(this.getSetting("selectionHeight", 1)));
            const dx = b.x - a.x, dy = b.y - a.y;
            let width = Math.abs(dx), height = Math.abs(dy);
            if (width / ratioWidth < height / ratioHeight) height = width * ratioHeight / ratioWidth;
            else width = height * ratioWidth / ratioHeight;
            rect = Rectangle.absolute(a.x, a.y, a.x + Math.sign(dx || 1) * width, a.y + Math.sign(dy || 1) * height);
        } else if (isShiftKeyDown) {
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
