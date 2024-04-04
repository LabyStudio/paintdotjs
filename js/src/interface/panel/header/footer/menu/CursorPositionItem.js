class CursorPositionItem extends LabelMenuItem {

    constructor() {
        super("cursorPositionItem");

        this.withIconPathKey("cursor_x_y_icon", true);

        this.app.on("document:mousemove", (x, y) => {
            this.updateText(this.getText());
        });
    }

    getText() {
        let documentWorkspace = this.app.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return "0, 0";
        }
        let renderBounds = documentWorkspace.getRenderBounds();

        let mouseX = this.app.getLastMouseX();
        let mouseY = this.app.getLastMouseY();

        let zoom = documentWorkspace.getZoom();

        let pixelX = (mouseX - renderBounds.getX()) / zoom;
        let pixelY = (mouseY - renderBounds.getY()) / zoom;

        return this.app.toUnit(Math.floor(pixelX)) + ", " + this.app.toUnit(Math.floor(pixelY));
    }

}