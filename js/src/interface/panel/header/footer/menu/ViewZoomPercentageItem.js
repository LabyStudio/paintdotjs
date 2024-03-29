class ViewZoomPercentageItem extends DropMenuItem {

    constructor() {
        super("zoomPercentageItem");

        this.textField = new TextFieldItem("zoomPercentageField");
        this.textField.setText(this.getText());
        this.textField.setSubmitCallback(text => {
            this.close();
        });
        this.add(this.textField);

        this.app.on("document:update_viewport", rectangle => {
            this.updateText();
            this.textField.setText(this.getText());
        });
    }

    isDropUp() {
        return true;
    }

    close() {
        super.close();

        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return;
        }

        let zoom = parseInt(this.textField.getText().replace("%", ""));
        if (isNaN(zoom)) {
            return;
        }

        activeDocumentWorkspace.setZoom(zoom / 100);
    }

    getText() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return "100%";
        }
        return Math.round(activeDocumentWorkspace.getZoom() * 100) + "%";
    }
}