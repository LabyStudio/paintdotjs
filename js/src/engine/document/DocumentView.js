class DocumentView {

    constructor(app) {
        this.app = app;
        this.document = null
        this.compositionSurface = null;

        this.viewportX = 0;
        this.viewportY = 0;

        this.zoom = 1;

        this.app.on("document:update_viewport", () => {
            this.app.setViewPosition(this.viewportX, this.viewportY);

            this.update();
        });
    }

    setDocument(document) {
        this.document = document;

        // Create surface for composition (Canvas that combines all layers)
        if (this.compositionSurface === null) {
            this.compositionSurface = new Surface(document.getWidth(), document.getHeight());
        }
    }

    fitViewport() {
        let margin = 40;

        let viewWidth = this.app.getViewWidth() - margin * 2;
        let viewHeight = this.app.getViewHeight() - margin * 2;

        let environmentCenterX = this.app.getEnvironmentWidth() / 2;
        let environmentCenterY = this.app.getEnvironmentHeight() / 2;

        let documentWidth = this.getWidth();
        let documentHeight = this.getHeight();

        let x = environmentCenterX - viewWidth / 2;
        let y = environmentCenterY - viewHeight / 2;

        if (documentWidth > viewWidth || documentHeight > viewHeight) {
            let documentAspectRatio = documentWidth / documentHeight;
            let screenAspectRatio = viewWidth / viewHeight;

            if (documentAspectRatio > screenAspectRatio) {
                // Fit to width
                let height = viewWidth / documentAspectRatio;

                this.zoom = viewWidth / documentWidth;
                this.viewportX = x;
            } else {
                // Fit to height
                let width = viewHeight * documentAspectRatio;

                this.zoom = viewHeight / documentHeight;
                this.viewportY = y;
            }
        }

        this.centerView();

        this.app.fire("document:update_viewport");
    }

    update() {
        this.document.update(new RenderArgs(this.compositionSurface));
    }

    getCompositionSurface() {
        return this.compositionSurface;
    }

    getWidth() {
        return this.document.getWidth();
    }

    getHeight() {
        return this.document.getHeight();
    }

    getZoom() {
        return this.zoom;
    }

    setZoom(factor) {
        let prevZoom = Math.max(this.zoom, 1);
        let prevWidth = this.getWidth() * prevZoom;
        let prevHeight = this.getHeight() * prevZoom;

        this.zoom = factor;

        let newZoom = Math.max(this.zoom, 1);
        let newWidth = this.getWidth() * newZoom;
        let newHeight = this.getHeight() * newZoom;

        this.viewportX = this.viewportX * (newWidth / prevWidth);
        this.viewportY = this.viewportY * (newHeight / prevHeight);

        this.app.fire("document:update_viewport");

        this.app.updateCanvasBounds();
    }

    setViewPosition(x, y) {
        this.viewportX = x;
        this.viewportY = y;

        this.app.fire("document:update_viewport");
    }

    getViewportX() {
        return this.viewportX;
    }

    getViewportY() {
        return this.viewportY;
    }

    centerView() {
        let x = this.app.getViewWidth() / 2;
        let y = this.app.getViewHeight() / 2;
        this.setViewPosition(x, y);
    }

}