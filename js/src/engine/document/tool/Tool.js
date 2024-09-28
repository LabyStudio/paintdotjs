class Tool {

    constructor(id) {
        this.id = id;
        this.app = app;
    }

    getId() {
        return this.id;
    }

    onActivate() {

    }

    onMouseDown(mouseX, mouseY, button) {
        return false;
    }

    onMouseMove(mouseX, mouseY) {
        return false;
    }

    onMouseUp(mouseX, mouseY, button) {
        return false;
    }

}