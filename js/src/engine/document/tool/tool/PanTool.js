class PanTool extends Tool {

    constructor() {
        super("panTool");

        this.tracking = false;
        this.mouseClickX = 0;
        this.mouseClickY = 0;
    }

    onMouseDown(mouseX, mouseY, button) {
        this.app.setCursor("grabbing");

        this.tracking = true;

        let viewElement = this.app.getViewElement();
        this.mouseClickX = viewElement.scrollLeft + mouseX;
        this.mouseClickY = viewElement.scrollTop + mouseY;

        return true;
    }

    onMouseMove(mouseX, mouseY) {
        if (!this.tracking) {
            return false;
        }

        let viewElement = this.app.getViewElement();
        viewElement.scrollLeft = this.mouseClickX - mouseX;
        viewElement.scrollTop = this.mouseClickY - mouseY;

        return true;
    }

    onMouseUp(mouseX, mouseY, button) {
        if (this.tracking) {
            this.app.setCursor("grab");
            this.tracking = false;
            return true;
        }

        return false;
    }

    onActivate() {
        this.app.setCursor("grab");
    }

    isTracking() {
        return this.tracking;
    }

}