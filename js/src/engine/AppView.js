class AppView {

    static PAN_SCALE_FACTOR = 2;

    constructor() {
        this.canvas = Surface.fromCanvas(document.getElementById('canvas'));
        this.editor = document.getElementById('editor');
        this.environment = document.getElementById('environment');
        this.view = document.getElementById('view');

        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.controlKeyDown = false;
        this.shiftKeyDown = false;
        this.altKeyDown = false;

        this.panTool = null;
        this.listeners = {};

        this.gridVisible = false;
    }

    initialize() {
        // Pseudo pan tool instance for middle mouse click pan
        this.panTool = ToolType.PAN.create();

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
                if (activeDocumentWorkspace !== null && !activeDocumentWorkspace.isZoomToWindow()) {
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

            let documentWorkspace = this.getActiveDocumentWorkspace();
            if (documentWorkspace === null || documentWorkspace.isZoomToWindow()) {
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
            if (documentWorkspace === null || documentWorkspace.isZoomToWindow()) {
                return;
            }
            documentWorkspace.setViewPosition(this.getViewX(), this.getViewY());
        });

        window.addEventListener('keydown', event => {
            if (event.key === "Control") {
                this.controlKeyDown = true;
            }
            if (event.key === "Shift") {
                this.shiftKeyDown = true;
            }
            if (event.key === "Alt") {
                this.altKeyDown = true;
            }

            // Check if the active element is an input field, textarea, or a contenteditable element
            const activeElement = document.activeElement;
            const isInputField = activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable;

            if (isInputField) {
                return; // Allow default behavior for text inputs
            }

            event.preventDefault();
            event.stopPropagation();

            // console.log(ShortcutKey.fromEvent(event).toString());

            for (let entry of ActionRegistry.getActions()) {
                let command = entry[1];
                if (command.getShortcutKey().isEvent(event)) {
                    command.runPerformAction();
                }
            }
        });

        window.addEventListener('keyup', event => {
            if (event.key === "Control") {
                this.controlKeyDown = false;
            }
            if (event.key === "Shift") {
                this.shiftKeyDown = false;
            }
            if (event.key === "Alt") {
                this.altKeyDown = false;
            }
        });
    }

    updateCanvasBounds(shiftView = true) {
        let viewWidth = this.getViewWidth();
        let viewHeight = this.getViewHeight();

        this.canvas.setWidth(viewWidth);
        this.canvas.setHeight(viewHeight);

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return;
        }

        let envWidth = documentWorkspace.getEnvironmentWidth();
        let envHeight = documentWorkspace.getEnvironmentHeight();

        let offsetX = this.environment.clientWidth - envWidth;
        let offsetY = this.environment.clientHeight - envHeight;

        // Shift the view position so it stays centered
        if (shiftView) {
            documentWorkspace.shiftViewPosition(-offsetX / 2, -offsetY / 2);
        }

        // Update environment size
        let environment = document.getElementById("environment")
        environment.style.width = envWidth + "px";
        environment.style.height = envHeight + "px";

        // Update scrollbar visibility
        this.view.style.overflow = documentWorkspace.isZoomToWindow() ? "hidden" : "scroll";
    }

    render() {
        requestAnimationFrame(time => {
            this.render();
        });

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let renderBounds = documentWorkspace.getRenderBounds();
            documentWorkspace.render(this.canvas, renderBounds);
        }
    }

    setCursor(cursor) {
        this.editor.style.cursor = cursor;
    }

    setCursorImg(name) {
        this.setCursor("url('assets/cursors/" + name + ".png') 10 10, auto");
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
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let position = documentWorkspace.toDocumentPosition(new Point(mouseX, mouseY));
            if (this.onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, position)) {
                return true;
            }

            // Handle mouse down for middle mouse click pan
            if (button === 1) {
                return this.panTool.onMouseDown(mouseX, mouseY, button, position);
            }
        }
        return false;
    }

    onMouseMove(mouseX, mouseY) {
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let position = documentWorkspace.toDocumentPosition(new Point(mouseX, mouseY));
            if (this.onDocumentMouseMove(mouseX, mouseY, documentWorkspace, position)) {
                return true;
            }

            // Handle mouse move for middle mouse click pan
            if (this.panTool.isTracking()) {
                return this.panTool.onMouseMove(mouseX, mouseY, position);
            }
        }
        return false;
    }

    onMouseUp(mouseX, mouseY, button) {
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let position = documentWorkspace.toDocumentPosition(new Point(mouseX, mouseY));
            if (this.onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, position)) {
                return true;
            }

            // Handle mouse up for active tool
            if (this.panTool.isTracking()) {
                return this.panTool.onMouseUp(mouseX, mouseY, button, position);
            }
        }
        return false;
    }

    onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, position) {
        return false;
    }

    onDocumentMouseMove(mouseX, mouseY, documentWorkspace, position) {
        return false;
    }

    onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, position) {
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

    getViewBounds() {
        return Rectangle.fromElement(this.view);
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

    isGridVisible() {
        return this.gridVisible;
    }

    isControlKeyDown() {
        return this.controlKeyDown;
    }

    isShiftDown() {
        return this.shiftKeyDown;
    }

    isAltKeyDown() {
        return this.altKeyDown;
    }

    setGridVisible(visible) {
        this.gridVisible = visible;

        let activeDocumentWorkspace = this.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace !== null) {
            activeDocumentWorkspace.getGridRenderer().setVisible(visible);
        }

        this.fire("app:grid_visibility_changed", visible);
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