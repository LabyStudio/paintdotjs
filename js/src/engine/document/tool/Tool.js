class Tool {

    constructor(type) {
        this.type = type;
        this.app = app;
    }

    getType() {
        return this.type;
    }

    onActivate() {

    }

    onDeactivate() {

    }

    onMouseDown(mouseX, mouseY, button, position) {
        return false;
    }

    onMouseMove(mouseX, mouseY, position) {
        return false;
    }

    onMouseUp(mouseX, mouseY, button, position) {
        return false;
    }

    getDocumentWorkspace() {
        return this.app.getActiveDocumentWorkspace();
    }

    getSurfaceBox() {
        return this.getDocumentWorkspace().getSurfaceBox();
    }

    getSelection() {
        return this.getDocumentWorkspace().getSelection();
    }

}