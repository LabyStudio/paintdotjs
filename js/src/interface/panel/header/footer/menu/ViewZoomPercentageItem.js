class ViewZoomPercentageItem extends DropMenuItem {

    constructor() {
        super("zoomPercentageItem");

        this.add(new TextFieldItem("zoomPercentageField"));

        this.app.on("document:visible_document_rectangle_update", rectangle => {
            this.updateText();
        });
    }

    isDropUp() {
        return true;
    }

    getText() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return "100%";
        }
        return Math.round(activeDocumentWorkspace.getZoom() * 100) + "%";
    }
}