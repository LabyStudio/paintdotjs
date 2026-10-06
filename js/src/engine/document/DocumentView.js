class DocumentView {

    constructor(app) {
        this.app = app;
        this.document = null
        this.compositionSurface = null;

        this.surfaceBox = new SurfaceBox(app);

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
        this.app.on("document:invalidated", document => {
            if (document === this.document) {
                this.updateComposition();
            }
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

    setDocument(document, onDocumentAssigned = null) {
        this.onDocumentChanging(document)

        // Unregister from previous document
        if (this.document !== null) {
            this.document.invalidated.remove(this.onDocumentInvalidated);
        }

        // Set new document
        this.document = document;
        if (onDocumentAssigned !== null) onDocumentAssigned();

        // Register for new document
        this.document.invalidated.add(this.onDocumentInvalidated);

        // Create surface for composition (Canvas that combines all layers)
        if (this.compositionSurface !== null &&
            (this.compositionSurface.width !== document.getWidth() ||
                this.compositionSurface.height !== document.getHeight())) {
            this.compositionSurface.dispose();
            this.compositionSurface = null;
        }
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

        let documentWidth = this.getWidth();
        let documentHeight = this.getHeight();
        this.zoom = Math.min(1, viewWidth / documentWidth, viewHeight / documentHeight);
        this.app.updateCanvasBounds(false);
        this.centerView();
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
        factor = Utility.clamp(factor, 0.01, 100);
        const oldBounds = this.getRenderBounds();
        const documentX = (pivotX - oldBounds.x) / this.zoom;
        const documentY = (pivotY - oldBounds.y) / this.zoom;
        this.zoom = factor;
        const newWidth = this.getRenderWidth();
        const newHeight = this.getRenderHeight();
        const baseX = this.app.getViewWidth() - Math.min(newWidth, this.app.getViewWidth()) / 2;
        const baseY = this.app.getViewHeight() - Math.min(newHeight, this.app.getViewHeight()) / 2;
        this.viewportX = baseX - (pivotX - documentX * factor);
        this.viewportY = baseY - (pivotY - documentY * factor);
        this.app.updateCanvasBounds(false);
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
        if (this.zoomToWindow === zoomToWindow) return;
        this.zoomToWindow = zoomToWindow;

        this.app.updateCanvasBounds();
        this.app.fire("document:update_viewport", this);

        if (zoomToWindow) this.fitViewport();
    }

    zoomToRectangle(rectangle) {
        if (rectangle === null || rectangle.isEmpty()) return;
        const center = new Point(
            rectangle.getLeft() + rectangle.getWidth() / 2,
            rectangle.getTop() + rectangle.getHeight() / 2
        );
        const oldScreenCenter = this.toScreenPosition(center);
        const factor = Math.min(
            this.app.getViewWidth() / Math.max(1, rectangle.getWidth()),
            this.app.getViewHeight() / Math.max(1, rectangle.getHeight())
        );
        this.setZoomToWindow(false);
        this.setZoom(factor, oldScreenCenter.x, oldScreenCenter.y);
        this.shiftViewPosition(
            oldScreenCenter.x - this.app.getViewWidth() / 2,
            oldScreenCenter.y - this.app.getViewHeight() / 2
        );
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

    toDocumentPosition(point, continuous = false) {
        let renderBounds = this.getRenderBounds();
        let zoom = this.getZoom();

        let pixelX = (point.getX() - renderBounds.getX()) / zoom;
        let pixelY = (point.getY() - renderBounds.getY()) / zoom;

        // Drawing tools address the pixel containing the pointer. Transform
        // tools need the fractional position so they can snap the *distance*
        // moved at the half-pixel boundary, as Paint.NET does.
        return continuous
            ? new Point(pixelX, pixelY)
            : new Point(Math.floor(pixelX), Math.floor(pixelY));
    }

    toScreenPosition(point) {
        let renderBounds = this.getRenderBounds();
        let zoom = this.getZoom();

        let screenX = renderBounds.getX() + point.getX() * zoom;
        let screenY = renderBounds.getY() + point.getY() * zoom;

        return new Point(screenX, screenY);
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
