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

class LassoSelectTool extends SelectionTool {

    constructor(type) {
        super(type);
    }

    onActivate() {
        super.onActivate();
    }

    createShape(inputTracePoints) {
        // Do not append the closing point to the live pointer trace: rendering
        // happens repeatedly while dragging and v5 keeps that trace open.
        let inputTracePointsF = super.createShape(inputTracePoints).slice();

        // GeometryList treats the trace as a closed polygon in Paint.NET.
        // GraphicsPath.addLines() does not, so close it explicitly for every
        // combine mode before previewing or clipping it.
        if (inputTracePointsF.length > 2
            && !inputTracePointsF[0].equals(inputTracePointsF[inputTracePointsF.length - 1])) {
            inputTracePointsF.push(inputTracePointsF[0]);
        }

        return inputTracePointsF;
    }

    getCursorImgUp() {
        return "lasso_select_tool_cursor";
    }

    getCursorImgDown() {
        return "lasso_select_tool_mouse_down_cursor";
    }

    getCursorImgUpPlus() {
        return "lasso_select_tool_plus_cursor";
    }

    getCursorImgUpMinus() {
        return "lasso_select_tool_minus_cursor";
    }

}
