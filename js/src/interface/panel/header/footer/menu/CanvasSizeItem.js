class CanvasSizeItem extends LabelMenuItem {

    constructor() {
        super("canvasSizeItem");

        this.withIconPathKey("image_size_icon", true);

        this.app.on("document:update_size", (width, height) => {
            this.updateText(this.getText());
        });

        this.app.on("app:update_active_document", documentWorkspace => {
            this.updateText(this.getText());
        });

        this.app.on("app:update_measurement_unit", unit => {
            this.updateText(this.getText());
        });
    }

    getText() {
        let documentWorkspace = this.app.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return "0 x 0";
        }

        return this.app.toUnit(documentWorkspace.getWidth()) + " x " + this.app.toUnit(documentWorkspace.getHeight());
    }

}