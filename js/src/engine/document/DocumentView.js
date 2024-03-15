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

        let screenWidth = this.app.getWidth() - margin * 2;
        let screenHeight = this.app.getHeight() - margin * 2;

        let documentWidth = this.getWidth();
        let documentHeight = this.getHeight();

        if (documentWidth > screenWidth || documentHeight > screenHeight) {
            let documentAspectRatio = documentWidth / documentHeight;
            let screenAspectRatio = screenWidth / screenHeight;

            if (documentAspectRatio > screenAspectRatio) {
                // Fit to width
                let height = screenWidth / documentAspectRatio;
                this.visibleDocumentRectangle = Rectangle.relative(
                    margin,
                    margin + (screenHeight - height) / 2,
                    screenWidth,
                    height
                );
            } else {
                // Fit to height
                let width = screenHeight * documentAspectRatio;
                this.visibleDocumentRectangle = Rectangle.relative(
                    margin + (screenWidth - width) / 2,
                    margin,
                    width,
                    screenHeight
                );
            }
        } else {
            this.visibleDocumentRectangle = Rectangle.relative(
                margin + (screenWidth - documentWidth) / 2,
                margin + (screenHeight - documentHeight) / 2,
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