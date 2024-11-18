class DocumentView {

    constructor(app) {
        this.app = app;
        this.document = null
        this.compositionSurface = null;

        this.surfaceBox = new SurfaceBox();

        this.gridRenderer = new SurfaceBoxGridRenderer(this.surfaceBox);
        this.gridRenderer.setVisible(false);
        this.surfaceBox.addRenderer(this.gridRenderer);

        this.viewportX = 0;
        this.viewportY = 0;

        this.zoom = 1;
        this.zoomToWindow = false;

        // Bind instance methods
        this.onDocumentInvalidated = this.onDocumentInvalidated.bind(this);

        this.app.on("document:update_viewport", documentView => {
            if (documentView !== this) {
                return;
            }

            this.app.setViewPosition(this.viewportX, this.viewportY);

            // TODO Surface box pre-paint? (bad performance on scroll)
            // this.updateComposition();
        });
        this.app.on("document:invalidated", () => {
            // TODO Surface box pre-paint
            this.updateComposition();
        });
    }

    onDocumentInvalidated() {
        this.app.fire("document:invalidated", this.document);
    }

    onDocumentChanging(newDocument) {
        this.app.fire("document:changing", newDocument);
    }

    onDocumentChanged() {
        this.app.fire("document:changed", this.document);
    }

    setDocument(document) {
        this.onDocumentChanging(document)

        // Unregister from previous document
        if (this.document !== null) {
            this.document.invalidated.remove(this.onDocumentInvalidated);
        }

        // Set new document
        this.document = document;

        // Register for new document
        this.document.invalidated.add(this.onDocumentInvalidated);

        // Create surface for composition (Canvas that combines all layers)
        if (this.compositionSurface === null) {
            this.compositionSurface = Surface.create(document.getWidth(), document.getHeight());
        }
        this.surfaceBox.setSurface(this.compositionSurface);

        this.onDocumentChanged();
    }

    render(destination, renderBounds) {
        this.surfaceBox.render(destination, renderBounds);
    }

    fitViewport() {
        let margin = 40;

        let viewWidth = this.app.getViewWidth() - margin * 2;
        let viewHeight = this.app.getViewHeight() - margin * 2;

        let environmentCenterX = this.getEnvironmentWidth() / 2;
        let environmentCenterY = this.getEnvironmentHeight() / 2;

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

        this.app.fire("document:update_viewport", this);
    }

    updateComposition() {
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

    getRenderWidth() {
        return this.getWidth() * this.zoom;
    }

    getRenderHeight() {
        return this.getHeight() * this.zoom;
    }

    getEnvironmentWidth() {
        let viewWidth = this.app.getViewWidth();
        if (this.zoomToWindow) {
            return viewWidth;
        }
        return Math.max(viewWidth + this.getRenderWidth(), viewWidth * 2);
    }

    getEnvironmentHeight() {
        let viewHeight = this.app.getViewHeight();
        if (this.zoomToWindow) {
            return viewHeight;
        }
        return Math.max(viewHeight + this.getRenderHeight(), viewHeight * 2);
    }

    getZoom() {
        return this.zoom;
    }

    setZoom(
        factor,
        pivotX = this.app.getViewWidth() / 2,
        pivotY = this.app.getViewHeight() / 2
    ) {
        let renderBounds = this.getRenderBounds();

        let prevWidth = renderBounds.getWidth();
        let prevHeight = renderBounds.getHeight();

        let newWidth = this.getWidth() * factor;
        let newHeight = this.getHeight() * factor;

        let deltaX = (prevWidth - newWidth) / 2;
        let deltaY = (prevHeight - newHeight) / 2;

        // Previous coordinates for the image to render
        let prevRenderX = renderBounds.getX();
        let prevRenderY = renderBounds.getY();

        // The width and height of the image to scale depending on the pivot point
        let wrappingWidth = (pivotX - prevRenderX) * 2;
        let wrappingHeight = (pivotY - prevRenderY) * 2;

        // Convert to new scale
        wrappingWidth = wrappingWidth / prevWidth * newWidth;
        wrappingHeight = wrappingHeight / prevHeight * newHeight;

        // New coordinates for the image to render
        let newRenderX = pivotX - wrappingWidth / 2;
        let newRenderY = pivotY - wrappingHeight / 2;

        deltaX += prevRenderX - newRenderX;
        deltaY += prevRenderY - newRenderY;

        this.shiftViewPosition(deltaX, deltaY)

        this.zoom = factor;

        this.app.updateCanvasBounds();
        this.app.fire("document:update_viewport", this);
    }

    setViewPosition(x, y) {
        this.viewportX = x;
        this.viewportY = y;

        this.app.fire("document:update_viewport", this);
    }

    shiftViewPosition(deltaX, deltaY) {
        this.viewportX += deltaX;
        this.viewportY += deltaY;

        this.app.fire("document:update_viewport", this);
    }

    setZoomToWindow(zoomToWindow) {
        this.zoomToWindow = zoomToWindow;

        this.app.updateCanvasBounds();
        this.app.fire("document:update_viewport", this);

        this.fitViewport();
    }

    isZoomToWindow() {
        return this.zoomToWindow;
    }

    getViewportX() {
        return this.viewportX;
    }

    getViewportY() {
        return this.viewportY;
    }

    toDocumentPosition(point) {
        let renderBounds = this.getRenderBounds();
        let zoom = this.getZoom();

        let pixelX = (point.getX() - renderBounds.getX()) / zoom;
        let pixelY = (point.getY() - renderBounds.getY()) / zoom;

        return new Point(Math.floor(pixelX), Math.floor(pixelY));
    }

    getRenderBounds() {
        let viewWidth = this.app.getViewWidth();
        let viewHeight = this.app.getViewHeight();
        let renderWidth = this.getRenderWidth();
        let renderHeight = this.getRenderHeight();
        let x = viewWidth - Math.min(renderWidth, viewWidth) / 2 - this.viewportX;
        let y = viewHeight - Math.min(renderHeight, viewHeight) / 2 - this.viewportY;
        return Rectangle.relative(x, y, renderWidth, renderHeight);
    }

    centerView() {
        let x = this.app.getViewWidth() / 2;
        let y = this.app.getViewHeight() / 2;
        this.setViewPosition(x, y);
    }

    getDocument() {
        return this.document;
    }

    getSurfaceBox() {
        return this.surfaceBox;
    }

    getGridRenderer() {
        return this.gridRenderer;
    }

    getApp() {
        return this.app;
    }

}