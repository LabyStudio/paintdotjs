class AppView {

    constructor() {
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');

        this.listeners = {};

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

            this.fire("app:resize", this.getWidth(), this.getHeight());
        });

        // Cancel website zoom
        window.addEventListener('wheel', event => {
            if (event.ctrlKey) {
                event.preventDefault();

                // Handle mouse wheel zoom
                let delta = event.deltaY;
                let activeDocumentWorkspace = this.getActiveDocumentWorkspace();
                if (activeDocumentWorkspace !== null) {
                    let zoom = activeDocumentWorkspace.getZoom() - delta / 1000;
                    if (zoom < 0.1) {
                        zoom = 0.1; // Limit zoom to 1%
                    }
                    activeDocumentWorkspace.setZoom(zoom);
                }
            }
        }, {passive: false});
    }

    updateCanvasBounds() {
        let bounds = this.canvas.getBoundingClientRect();
        this.canvas.width = bounds.width;
        this.canvas.height = bounds.height;
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

        // Clear
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render the composition of the active document workspace
        this.context.drawImage(
            surface.canvas,
            view.getLeft(),
            view.getTop(),
            view.getWidth(),
            view.getHeight()
        );
    }

    getActiveDocumentWorkspace() {
        return null;
    }

    getWidth() {
        return this.canvas.width;
    }

    getHeight() {
        return this.canvas.height;
    }

    on(event, callback) {
        if (typeof this.listeners[event] === "undefined") {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    fire(event, ...args) {
        if (typeof this.listeners[event] === "undefined") {
            return;
        }
        for (let i = 0; i < this.listeners[event].length; i++) {
            this.listeners[event][i](...args);
        }
    }

}