class ViewZoomOutItem extends IconItem {

    constructor() {
        super("menuViewZoomOut", _ => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace === null) {
                return;
            }

            activeDocumentWorkspace.setZoom(activeDocumentWorkspace.getZoom() * 0.85);
        });
    }
}