class AppView {

    static PAN_SCALE_FACTOR = 2;

    constructor() {
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');

        this.panTool = null;

        this.listeners = {};

        this.updateCanvasBounds();
    }

    initialize() {
        this.panTool = ToolRegistry.get("panTool");

        // Center view
        this.centerView();

        this.render();

        window.addEventListener('resize', () => {
            this.updateCanvasBounds();

            // TODO change logic after implementing movement of the document
            let documentWorkspace = this.getActiveDocumentWorkspace();
            if (documentWorkspace !== null) {
                documentWorkspace.fitVisibleDocumentRectangle();
            }

            this.fire("app:resize", this.getViewWidth(), this.getViewHeight());
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

        // Cancel right click
        document.addEventListener('contextmenu', event => event.preventDefault());

        // Mouse down listener
        this.canvas.addEventListener('mousedown', event => {
            let x = event.clientX;
            let y = event.clientY;
            this.fire("document:mousedown", x, y, event.button);

            this.onMouseDown(x, y, event.button);

            event.preventDefault();
        });

        // Mouse move listener
        this.canvas.addEventListener('mousemove', event => {
            let x = event.clientX;
            let y = event.clientY;
            this.fire("document:mousemove", x, y);

            this.onMouseMove(x, y);

            event.preventDefault();
        });

        // Mouse up listener
        this.canvas.addEventListener('mouseup', event => {
            let x = event.clientX;
            let y = event.clientY;
            this.fire("document:mouseup", x, y, event.button);

            this.onMouseUp(x, y, event.button);

            event.preventDefault();
        });

        // Disable smooth scrolling
        this.getViewElement().addEventListener('wheel', event => {
            if (event.ctrlKey) {
                return;
            }

            event.preventDefault();

            let viewElement = this.getViewElement();
            if (event.shiftKey) {
                // noinspection JSSuspiciousNameCombination
                viewElement.scrollLeft += event.deltaY;
            } else {
                viewElement.scrollTop += event.deltaY;
                viewElement.scrollLeft += event.deltaX;
            }
        }, {passive: false});
    }

    updateCanvasBounds() {
        let pan = this.getViewElement();
        let bounds = pan.getBoundingClientRect();

        // Double the resolution to make space to pan the document
        this.canvas.width = bounds.width * AppView.PAN_SCALE_FACTOR;
        this.canvas.height = bounds.height * AppView.PAN_SCALE_FACTOR;
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

    setCursor(cursor) {
        this.canvas.style.cursor = cursor;
    }

    centerView() {
        let viewElement = this.getViewElement();
        viewElement.scrollLeft = (viewElement.scrollWidth - viewElement.clientWidth) / 2;
        viewElement.scrollTop = (viewElement.scrollHeight - viewElement.clientHeight) / 2;
    }

    onMouseDown(mouseX, mouseY, button) {
        // Handle mouse down for middle mouse click pan
        if (button === 1) {
            return this.panTool.onMouseDown(mouseX, mouseY, button);
        }
        return false;
    }

    onMouseMove(mouseX, mouseY) {
        // Handle mouse move for middle mouse click pan
        if (this.panTool.isTracking()) {
            return this.panTool.onMouseMove(mouseX, mouseY);
        }
        return false;
    }

    onMouseUp(mouseX, mouseY, button) {
        // Handle mouse up for active tool
        if (this.panTool.isTracking()) {
            return this.panTool.onMouseUp(mouseX, mouseY, button);
        }
        return false;
    }

    setViewPosition(x, y) {
        let viewElement = this.getViewElement();
        viewElement.scrollLeft = x;
        viewElement.scrollTop = y;
    }

    setViewX(x) {
        this.getViewElement().scrollLeft = x;
    }

    setViewY(y) {
        this.getViewElement().scrollTop = y;
    }

    getViewX() {
        return this.getViewElement().scrollLeft;
    }

    getViewY() {
        return this.getViewElement().scrollTop;
    }

    getActiveDocumentWorkspace() {
        return null;
    }

    getCanvasWidth() {
        return this.canvas.width;
    }

    getCanvasHeight() {
        return this.canvas.height;
    }

    getViewWidth() {
        return this.getViewElement().clientWidth;
    }

    getViewHeight() {
        return this.getViewElement().clientHeight;
    }

    getViewElement() {
        return this.canvas.parentElement;
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