class AppView {

    static PAN_SCALE_FACTOR = 2;

    constructor() {
        this.canvas = document.getElementById('canvas');
        this.editor = document.getElementById('editor');
        this.environment = document.getElementById('environment');
        this.view = document.getElementById('view');

        this.context = this.canvas.getContext('2d');

        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.panTool = null;
        this.listeners = {};
    }

    initialize() {
        this.panTool = ToolRegistry.get("panTool");

        this.updateCanvasBounds();

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
            let x = event.clientX - this.editor.offsetLeft;
            let y = event.clientY - this.editor.offsetTop - windowTop();

            if (event.ctrlKey) {
                event.preventDefault();

                // Handle mouse wheel zoom
                let delta = event.deltaY;
                let activeDocumentWorkspace = this.getActiveDocumentWorkspace();
                if (activeDocumentWorkspace !== null) {
                    let zoom = activeDocumentWorkspace.getZoom() - delta * activeDocumentWorkspace.getZoom() / 1000;
                    if (zoom < 0.01) {
                        zoom = 0.01; // Limit zoom to 1%
                    }
                    if (zoom > 100) {
                        zoom = 100; // Limit zoom to 10000%
                    }

                    activeDocumentWorkspace.setZoom(zoom, x, y);
                }
            }
        }, {passive: false});

        // Cancel right click
        document.addEventListener('contextmenu', event => event.preventDefault());

        // Mouse down listener
        this.editor.addEventListener('mousedown', event => {
            let x = event.clientX - this.editor.offsetLeft;
            let y = event.clientY - this.editor.offsetTop - windowTop();
            this.fire("document:mousedown", x, y, event.button);

            this.onMouseDown(x, y, event.button);

            event.preventDefault();
        });

        // Mouse move listener
        this.editor.addEventListener('mousemove', event => {
            let x = event.clientX - this.editor.offsetLeft;
            let y = event.clientY - this.editor.offsetTop - windowTop();
            this.fire("document:mousemove", x, y);

            this.onMouseMove(x, y);

            event.preventDefault();
        });

        // Mouse up listener
        document.addEventListener('mouseup', event => {
            let x = event.clientX - this.editor.offsetLeft;
            let y = event.clientY - this.editor.offsetTop - windowTop();
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

            if (event.shiftKey) {
                // noinspection JSSuspiciousNameCombination
                this.view.scrollLeft += event.deltaY;
            } else {
                this.view.scrollTop += event.deltaY;
                this.view.scrollLeft += event.deltaX;
            }
        }, {passive: false});

        this.view.addEventListener('scroll', event => {
            let documentWorkspace = this.getActiveDocumentWorkspace();
            if (documentWorkspace === null) {
                return;
            }
            documentWorkspace.setViewPosition(this.getViewX(), this.getViewY());
        });
    }

    updateCanvasBounds() {
        let viewWidth = this.getViewWidth();
        let viewHeight = this.getViewHeight();

        this.canvas.width = viewWidth;
        this.canvas.height = viewHeight;

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return;
        }

        let envWidth = documentWorkspace.getEnvironmentWidth();
        let envHeight = documentWorkspace.getEnvironmentHeight();

        let offsetX = this.environment.clientWidth - envWidth;
        let offsetY = this.environment.clientHeight - envHeight;

        // Shift the view position so it stays centered
        documentWorkspace.shiftViewPosition(-offsetX / 2, -offsetY / 2);

        // Update environment size
        let environment = document.getElementById("environment")
        environment.style.width = envWidth + "px";
        environment.style.height = envHeight + "px";
    }

    render() {
        requestAnimationFrame(time => {
            this.render();
        });

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return;
        }

        // Clear
        this.context.clearRect(0, 0, this.getViewWidth(), this.getViewHeight());

        // Render the composition of the active document workspace
        let surface = documentWorkspace.getCompositionSurface();
        let renderBounds = documentWorkspace.getRenderBounds();
        ImageUtil.drawImage(
            this.context,
            surface.canvas,
            0,
            0,
            documentWorkspace.getWidth(),
            documentWorkspace.getHeight(),
            renderBounds.getX(),
            renderBounds.getY(),
            renderBounds.getWidth(),
            renderBounds.getHeight()
        );

        // Debug
        this.context.font = "16px Arial";
        this.context.fillStyle = "white";
        this.context.fillText(documentWorkspace.getWidth() + "x" + documentWorkspace.getHeight(), 10, 20 + 16);
        this.context.fillText(documentWorkspace.getViewportX() + ", " + documentWorkspace.getViewportY(), 10, 20 + 16 * 2);
        this.context.fillText(parseInt(renderBounds.getX()) + ", " + parseInt(renderBounds.getY()), 10, 20 + 16 * 4);
        this.context.fillText(parseInt(renderBounds.getWidth()) + "x" + parseInt(renderBounds.getHeight()), 10, 20 + 16 * 5);

        this.context.fillText(parseInt(documentWorkspace.getZoom() * 100) / 100, 10, 20 + 16 * 7);
        this.context.fillText(parseInt(this.getLastMouseX()) + ", " + parseInt(this.getLastMouseY()), 10, 20 + 16 * 8);
    }

    setCursor(cursor) {
        this.editor.style.cursor = cursor;
    }

    onResize(width, height) {
        this.updateCanvasBounds();

        // TODO change logic after implementing movement of the document
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            documentWorkspace.fitViewport();
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
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

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

    getLastMouseX() {
        return this.lastMouseX;
    }

    getLastMouseY() {
        return this.lastMouseY;
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