class LassoSelectTool extends SelectionTool {

    constructor(type) {
        super(type);
    }

    onActivate() {
        super.onActivate();
    }

    createShape(inputTracePoints) {
        let inputTracePointsF = super.createShape(inputTracePoints);

        if (this.combineMode !== CombineMode.REPLACE
            && inputTracePointsF.length > 2
            && inputTracePointsF[0] !== inputTracePointsF[inputTracePointsF.length - 1]) {
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