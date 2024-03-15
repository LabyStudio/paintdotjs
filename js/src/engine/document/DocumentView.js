class DocumentView {

    constructor(app) {
        this.app = app;
        this.document = null
        this.compositionSurface = null;

        this.visibleDocumentRectangle = Rectangle.relative(0, 0, 0, 0);

        this.app.on("document:visible_document_rectangle_update", () => {
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

    fitVisibleDocumentRectangle() {
        let margin = 40;

        let viewWidth = this.app.getViewWidth() - margin * 2;
        let viewHeight = this.app.getViewHeight() - margin * 2;

        let canvasCenterX = this.app.getCanvasWidth() / 2;
        let canvasCenterY = this.app.getCanvasHeight() / 2;

        let documentWidth = this.getWidth();
        let documentHeight = this.getHeight();

        let x = canvasCenterX - viewWidth / 2 + margin;
        let y = canvasCenterY - viewHeight / 2 + margin;

        if (documentWidth > viewWidth || documentHeight > viewHeight) {
            let documentAspectRatio = documentWidth / documentHeight;
            let screenAspectRatio = viewWidth / viewHeight;

            if (documentAspectRatio > screenAspectRatio) {
                // Fit to width
                let height = viewWidth / documentAspectRatio;
                this.visibleDocumentRectangle = Rectangle.relative(
                    x,
                    y + (viewHeight - height) / 2,
                    viewWidth,
                    height
                );
            } else {
                // Fit to height
                let width = viewHeight * documentAspectRatio;
                this.visibleDocumentRectangle = Rectangle.relative(
                    x + (viewWidth - width) / 2,
                    y,
                    width,
                    viewHeight
                );
            }
        } else {
            this.visibleDocumentRectangle = Rectangle.relative(
                x + (viewWidth - documentWidth) / 2,
                y + (viewHeight - documentHeight) / 2,
                documentWidth,
                documentHeight
            );
        }

        this.app.fire("document:visible_document_rectangle_update", this.visibleDocumentRectangle);
    }

    update() {
        this.document.update(new RenderArgs(this.compositionSurface));
    }

    getCompositionSurface() {
        return this.compositionSurface;
    }

    getVisibleDocumentRectangle() {
        return this.visibleDocumentRectangle;
    }

    getWidth() {
        return this.document.getWidth();
    }

    getHeight() {
        return this.document.getHeight();
    }

    getZoom() {
        return this.visibleDocumentRectangle.getWidth() / this.getWidth();
    }

    setZoom(factor) {
        let width = this.getWidth() * factor;
        let height = this.getHeight() * factor;
        this.visibleDocumentRectangle = Rectangle.relative(
            this.visibleDocumentRectangle.getLeft() + (this.visibleDocumentRectangle.getWidth() - width) / 2,
            this.visibleDocumentRectangle.getTop() + (this.visibleDocumentRectangle.getHeight() - height) / 2,
            width,
            height
        );
        this.app.fire("document:visible_document_rectangle_update", this.visibleDocumentRectangle);
    }

}