class Tool {

    constructor(type) {
        this.type = type;
        this.app = app;

        this.selectionChangedListener = this.onSelectionChanged.bind(this);
    }

    getType() {
        return this.type;
    }

    onActivate() {
        this.getSelection().changed.add(this.selectionChangedListener);
    }

    onDeactivate() {
        this.getSelection().changed.remove(this.selectionChangedListener);
    }

    onSelectionChanged() {

    }

    onPulse() {
        // TODO panTracking & right click
    }

    onKeyPress(key) {
        return false;
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

    dispose() {

    }

    getName() {
        return this.type.getName();
    }

    getImage() {
        return this.type.getIconSrc();
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