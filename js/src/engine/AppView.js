class AppView {

    static PAN_SCALE_FACTOR = 2;

    constructor() {
        this.canvas = document.getElementById('canvas');
        this.editor = document.getElementById('editor');
        this.environment = document.getElementById('environment');
        this.view = document.getElementById('view');

        this.context = this.canvas.getContext('2d');

        this.panTool = null;
        this.listeners = {};

        this.updateCanvasBounds();
    }

    initialize() {
        this.panTool = ToolRegistry.get("panTool");

        // Center view
        this.centerView();

        // Start rendering
        this.render();

        window.addEventListener('load', () => {
            this.onResize(this.getViewWidth(), this.getViewHeight());
        });
        window.addEventListener('resize', () => {
            this.onResize(this.getViewWidth(), this.getViewHeight());
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
        this.environment.addEventListener('mousedown', event => {
            let x = event.clientX;
            let y = event.clientY;
            this.fire("document:mousedown", x, y, event.button);

            this.onMouseDown(x, y, event.button);

            event.preventDefault();
        });

        // Mouse move listener
        this.environment.addEventListener('mousemove', event => {
            let x = event.clientX;
            let y = event.clientY;
            this.fire("document:mousemove", x, y);

            this.onMouseMove(x, y);

            event.preventDefault();
        });

        // Mouse up listener
        document.addEventListener('mouseup', event => {
            let x = event.clientX;
            let y = event.clientY;
            this.fire("document:mouseup", x, y, event.button);

            this.onMouseUp(x, y, event.button);

            event.preventDefault();
        });

        // Disable smooth scrolling
        this.view.addEventListener('wheel', event => {
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

        this.canvas.width = bounds.width;
        this.canvas.height = bounds.height;

        let environment = document.getElementById("environment")
        environment.style.width = bounds.width * 2 + "px";
        environment.style.height = bounds.height * 2 + "px";
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
            view.getLeft() - this.getViewX(),
            view.getTop() - this.getViewY(),
            view.getWidth(),
            view.getHeight()
        );
    }

    setCursor(cursor) {
        this.editor.style.cursor = cursor;
    }

    centerView() {
        this.setViewPosition(
            this.getEnvironmentWidth() / 2 - this.getViewWidth() / 2,
            this.getEnvironmentHeight() / 2 - this.getViewHeight() / 2
        )
    }

    onResize(width, height) {
        this.updateCanvasBounds();

        // TODO change logic after implementing movement of the document
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            documentWorkspace.fitVisibleDocumentRectangle();
            this.centerView();
        }

        this.fire("app:resize", width, height);
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
        this.view.scrollLeft = x;
        this.view.scrollTop = y;
    }

    setViewX(x) {
        this.view.scrollLeft = x;
    }

    setViewY(y) {
        this.view.scrollTop = y;
    }

    getViewX() {
        return this.view.scrollLeft;
    }

    getViewY() {
        return this.view.scrollTop;
    }

    getActiveDocumentWorkspace() {
        return null;
    }

    getEnvironmentWidth() {
        return this.environment.clientWidth;
    }

    getEnvironmentHeight() {
        return this.environment.clientHeight;
    }

    getViewWidth() {
        return this.view.clientWidth;
    }

    getViewHeight() {
        return this.view.clientHeight;
    }

    getViewElement() {
        return this.view;
    }

    getEditorElement() {
        return this.editor;
    }

    getEnvironmentElement() {
        return this.environment;
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