class Tool {

    constructor(type) {
        this.type = type;
        this.app = app;

        this.selectionChangedListener = this.onSelectionChanged.bind(this);
        this.historyChangedListener = this.onHistoryChanged.bind(this);

        this.selection = null;
        this.historyStack = null;
        this.active = false;
    }

    getType() {
        return this.type;
    }

    onActivate() {
        this.selection = this.getSelection();
        this.selection.changed.add(this.selectionChangedListener);

        this.historyStack = this.getDocumentWorkspace().getHistory();
        this.historyStack.executed.add(this.historyChangedListener);

        this.active = true;
    }

    onDeactivate() {
        this.active = false;

        this.selection.changed.remove(this.selectionChangedListener);
        this.historyStack.executed.remove(this.historyChangedListener);
    }

    onSelectionChanged() {

    }

    onHistoryChanged() {

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

    isActive() {
        return this.active;
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