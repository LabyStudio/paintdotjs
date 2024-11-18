class ViewZoomInItem extends IconItem {

    constructor() {
        super("menuViewZoomIn", _ => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace === null) {
                return;
            }

            activeDocumentWorkspace.setZoom(activeDocumentWorkspace.getZoom() * 1.25);
        });
    }
}