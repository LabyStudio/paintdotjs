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

        let mouseX = this.app.getLastMouseX();
        let mouseY = this.app.getLastMouseY();

        let position = documentWorkspace.toDocumentPosition(new Point(mouseX, mouseY));

        return this.app.toUnit(position.getX()) + ", " + this.app.toUnit(position.getY());
    }

}