class AppView {

    constructor() {
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');

        this.updateCanvasBounds();
    }

    initialize() {
        this.render();

        window.addEventListener('resize', () => {
            this.updateCanvasBounds();

            // TODO change logic after implementing movement of the document
            let documentWorkspace = this.getActiveDocumentWorkspace();
            if (documentWorkspace !== null) {
                documentWorkspace.fitVisibleDocumentRectangle();
            }
        });
    }

    updateCanvasBounds() {
        let bounds = this.canvas.getBoundingClientRect();
        this.width = this.canvas.width = bounds.width;
        this.height = this.canvas.height = bounds.height;
    }

    render() {
        requestAnimationFrame(time => {
            this.render();
        });

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return;
        }

        let surface = documentWorkspace.getCompositionSurface();
        let view = documentWorkspace.getVisibleDocumentRectangle();

        // Render the composition of the active document workspace
        this.context.drawImage(
            surface.canvas,
            view.x, view.y,
            view.width,
            view.height,
        );
    }

    getActiveDocumentWorkspace() {
        return null;
    }

}