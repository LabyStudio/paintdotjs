class EraserTool extends DrawingTool {
    constructor(type) {
        super(type, 10, true, true);
    }

    onActivate() {
        super.onActivate();
        this.app.setCursorImg("eraser_tool_cursor");
    }

    onMouseDown(x, y, button, input = null) {
        const handled = super.onMouseDown(x, y, button, input);
        if (handled) this.app.setCursor("none");
        return handled;
    }

    onMouseUp(x, y, button, input = null) {
        const handled = super.onMouseUp(x, y, button, input);
        if (handled) this.app.setCursorImg("eraser_tool_cursor");
        return handled;
    }
}
