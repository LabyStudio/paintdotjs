class DocumentView {

    constructor(app) {
        this.app = app;
        this.document = null
        this.compositionSurface = null;

        this.visibleDocumentRectangle = Rectangle.relative(0, 0, 0, 0);
    }

    setDocument(document) {
        this.document = document;

        // Create surface for composition (Canvas that combines all layers)
        if (this.compositionSurface === null) {
            this.compositionSurface = new Surface(document.width, document.height);
        }
    }

    fitVisibleDocumentRectangle() {
        let margin = 40;

        let screenWidth = this.app.width - margin * 2;
        let screenHeight = this.app.height - margin * 2;

        let documentWidth = this.document.width;
        let documentHeight = this.document.height;

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

}