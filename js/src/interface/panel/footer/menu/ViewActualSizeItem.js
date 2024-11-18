class ViewActualSizeItem extends IconItem {

    constructor() {
        super("menuViewActualSize", () => {
            this.setZoomToWindow(!this.zoomToWindow);
        });

        this.zoomToWindow = false;
    }

    setZoomToWindow(zoomToWindow) {
        this.zoomToWindow = zoomToWindow;
        this.withIconPathKey(
            this.zoomToWindow
                ? "menu_view_zoom_to_window_icon"
                : "menu_view_actual_size_icon",
            true
        );
        this.reinitialize();

        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace !== null) {
            activeDocumentWorkspace.setZoomToWindow(zoomToWindow);
        }
    }

}