class PanTool extends Tool {

    constructor(type) {
        super(type);

        this.tracking = false;
        this.mouseClickX = 0;
        this.mouseClickY = 0;
    }

    onMouseDown(mouseX, mouseY, button, position) {
        this.app.setCursorImg("hand_closed_cursor");

        this.tracking = true;

        let viewElement = this.app.getViewElement();
        this.mouseClickX = viewElement.scrollLeft + mouseX;
        this.mouseClickY = viewElement.scrollTop + mouseY;

        return true;
    }

    onMouseMove(mouseX, mouseY, position) {
        if (!this.tracking) {
            return false;
        }

        let viewElement = this.app.getViewElement();
        viewElement.scrollLeft = this.mouseClickX - mouseX;
        viewElement.scrollTop = this.mouseClickY - mouseY;

        return true;
    }

    onMouseUp(mouseX, mouseY, button, position) {
        if (this.tracking) {
            this.app.setCursorImg("hand_open_cursor");
            this.tracking = false;
            return true;
        }

        return false;
    }

    onActivate() {
        this.app.setCursorImg("hand_open_cursor");
    }

    isTracking() {
        return this.tracking;
    }

}