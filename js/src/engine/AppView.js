class AppView {

    static PAN_SCALE_FACTOR = 2;
    static RULER_SIZE = 17;

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
        this.cursorImages = new Map();
        this.cursorRequest = 0;

        this.gridVisible = false;
        this.rulersVisible = false;
        this.rulerRenderSignature = null;

        this.horizontalRuler = document.createElement("canvas");
        this.horizontalRuler.className = "editor-ruler horizontal";
        this.verticalRuler = document.createElement("canvas");
        this.verticalRuler.className = "editor-ruler vertical";
        this.rulerCorner = document.createElement("div");
        this.rulerCorner.className = "editor-ruler-corner";
        this.editor.append(this.horizontalRuler, this.verticalRuler, this.rulerCorner);
    }

    initialize() {
        // Pseudo pan tool instance for middle mouse click pan
        this.panTool = ToolType.PAN.create();

        this.updateCanvasBounds();

        // Start rendering
        this.render();

        window.addEventListener('load', () => {
            try {
                this.onResize(this.getViewWidth(), this.getViewHeight());
            } catch (e) {
                this.handleError(e);
            }
        });
        window.addEventListener('resize', () => {
            try {
                this.onResize(this.getViewWidth(), this.getViewHeight());
            } catch (e) {
                this.handleError(e);
            }
        });

        // Cancel website zoom
        window.addEventListener('wheel', event => {
            let x = event.clientX - this.editor.offsetLeft;
            let y = event.clientY - this.editor.offsetTop - windowTop();

            if (event.ctrlKey) {
                event.preventDefault();

                // Modal forms own their input. In particular, Ctrl+wheel may be
                // used by an image preview and must never zoom the document
                // underneath the dialog.
                if (ModalDialogController.isActive()) {
                    return;
                }

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

        const getPointerPressure = event => {
            const pointerInputEnabled = typeof AppSettingsStore === "undefined"
                || AppSettingsStore.get("pen.pointerInput", true);
            return event.pointerType === "mouse" || !pointerInputEnabled
                ? 1
                : Utility.clamp(event.pressure || 0.5, 0, 1);
        };
        const getPointerPosition = event => ({
            x: event.clientX - this.editor.offsetLeft,
            y: event.clientY - this.editor.offsetTop - windowTop(),
            pressure: getPointerPressure(event),
            pointerType: event.pointerType || "mouse",
            timeStamp: event.timeStamp
        });
        const getPointerInput = event => {
            const events = typeof event.getCoalescedEvents === "function"
                ? event.getCoalescedEvents()
                : [event];
            return {
                pressure: getPointerPressure(event),
                pointerType: event.pointerType || "mouse",
                samples: events.map(getPointerPosition)
            };
        };

        // Pointer events retain pen pressure and the browser's coalesced input
        // samples. Paint.NET 5's brush pipeline consumes the same information
        // instead of reducing every device to a stream of mouse coordinates.
        this.editor.addEventListener('pointerdown', event => {
            try {
                const point = getPointerPosition(event);
                let x = point.x;
                let y = point.y;
                this.fire("document:mousedown", x, y, event.button);
                if (typeof this.editor.setPointerCapture === "function") {
                    this.editor.setPointerCapture(event.pointerId);
                }
                this.onMouseDown(x, y, event.button, getPointerInput(event));
            } catch (e) {
                this.handleError(e);
            }
        });

        this.editor.addEventListener('pointermove', event => {
            try {
                const autoScroll = typeof AppSettingsStore === "undefined"
                    || AppSettingsStore.get("ui.autoScrollWhileDrawing", true);
                const activeTool = this.getActiveTool();
                if (autoScroll && activeTool !== null && activeTool.isActive()) {
                    const bounds = this.editor.getBoundingClientRect();
                    const edge = 24;
                    const speed = 12;
                    const deltaX = event.clientX < bounds.left + edge
                        ? -speed
                        : (event.clientX > bounds.right - edge ? speed : 0);
                    const deltaY = event.clientY < bounds.top + edge
                        ? -speed
                        : (event.clientY > bounds.bottom - edge ? speed : 0);
                    if (deltaX !== 0 || deltaY !== 0) this.view.scrollBy(deltaX, deltaY);
                }

                const point = getPointerPosition(event);
                let x = point.x;
                let y = point.y;
                this.fire("document:mousemove", x, y);
                this.onMouseMove(x, y, getPointerInput(event));
            } catch (e) {
                this.handleError(e);
            }

            event.preventDefault();
        });

        this.editor.addEventListener('pointerup', event => {
            try {
                const point = getPointerPosition(event);
                let x = point.x;
                let y = point.y;
                this.fire("document:mouseup", x, y, event.button);
                this.onMouseUp(x, y, event.button, getPointerInput(event));
            } catch (e) {
                this.handleError(e);
            }

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

            // Keep native editing and clipboard shortcuts inside text controls and
            // for selected page text. Otherwise Ctrl+C would copy the canvas
            // selection over text selected in an error or settings window.
            const activeElement = document.activeElement;
            const isInputField = activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable;
            const selection = window.getSelection();
            const hasSelectedText = selection !== null && !selection.isCollapsed
                && selection.toString().length > 0;
            const normalizedKey = String(event.key).toLowerCase();
            const isNativeSelectionShortcut = hasSelectedText
                && (event.ctrlKey || event.metaKey)
                && ["a", "c", "x"].includes(normalizedKey);

            // Do not dispatch application shortcuts while a modal form is open.
            // Keep normal typing, focus navigation, and control interaction in
            // the dialog, while suppressing browser/app Ctrl shortcuts.
            if (ModalDialogController.isActive()) {
                if ((event.ctrlKey || event.metaKey) && !isInputField && !isNativeSelectionShortcut) {
                    event.preventDefault();
                }
                return;
            }

            if (isInputField || isNativeSelectionShortcut) {
                return; // Allow default behavior for text inputs
            }

            event.preventDefault();
            event.stopPropagation();

            if (this.onKeyPress(event.key)) {
                return;
            }

            ActionRegistry.dispatch(event);
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
        this.renderRulers(documentWorkspace);
    }

    setCursor(cursor) {
        ++this.cursorRequest;
        if (this.editor.style.cursor === cursor) {
            return;
        }
        this.editor.style.cursor = cursor;
    }

    setCursorImg(name) {
        const request = ++this.cursorRequest;
        const cached = this.cursorImages.get(name);
        if (typeof cached === "string") {
            this.editor.style.cursor = this.cursorCss(cached, name);
            return;
        }

        // The extracted Paint.NET cursor resources contain two opaque red
        // size-marker pixels. Browsers display those markers, unlike Windows'
        // native cursor loader, so remove them once and cache the clean bitmap.
        if (cached instanceof Promise) {
            cached.then(url => {
                if (request === this.cursorRequest) this.editor.style.cursor = this.cursorCss(url, name);
            });
            return;
        }

        const source = "assets/cursors/" + name + ".png";
        const loading = this.cleanCursorImage(source).catch(() => source);
        this.cursorImages.set(name, loading);
        loading.then(url => {
            this.cursorImages.set(name, url);
            if (request === this.cursorRequest) this.editor.style.cursor = this.cursorCss(url, name);
        });
    }

    cursorCss(url, name = null) {
        // Cursor resources have individual native hotspots. The text cursor's
        // insertion point is the center of its I-beam; 10,10 is the brush tip.
        const hotspot = name === "text_tool_cursor" ? [16, 16] : [10, 10];
        return `url('${url}') ${hotspot[0]} ${hotspot[1]}, auto`;
    }

    cleanCursorImage(source) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext("2d");
                context.drawImage(image, 0, 0);
                const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

                for (let offset = 0; offset < pixels.data.length; offset += 4) {
                    if (pixels.data[offset] === 255
                        && pixels.data[offset + 1] === 0
                        && pixels.data[offset + 2] === 0
                        && pixels.data[offset + 3] !== 0) {
                        pixels.data[offset + 3] = 0;
                    }
                }

                context.putImageData(pixels, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            image.onerror = reject;
            image.src = source;
        });
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

    onKeyPress(key) {
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            return this.onDocumentKeyPress(key, documentWorkspace);
        }
        return false;
    }

    onMouseDown(mouseX, mouseY, button, input = null) {
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let position = this.toToolDocumentPosition(documentWorkspace, mouseX, mouseY);

            // Handle mouse down for middle mouse click pan
            if (button === MouseButton.MIDDLE) {
                return this.panTool.onMouseDown(position.getX(), position.getY(), button);
            }

            if (this.onDocumentMouseDown(position.getX(), position.getY(), button, documentWorkspace,
                this.toDocumentPointerInput(documentWorkspace, input))) {
                return true;
            }
        }
        return false;
    }

    onMouseMove(mouseX, mouseY, input = null) {
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;

        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let position = this.toToolDocumentPosition(documentWorkspace, mouseX, mouseY);

            // Handle mouse move for middle mouse click pan
            if (this.panTool.isTracking()) {
                return this.panTool.onMouseMove(position.getX(), position.getY());
            }

            if (this.onDocumentMouseMove(position.getX(), position.getY(), documentWorkspace,
                this.toDocumentPointerInput(documentWorkspace, input))) {
                return true;
            }
        }
        return false;
    }

    onMouseUp(mouseX, mouseY, button, input = null) {
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null) {
            let position = this.toToolDocumentPosition(documentWorkspace, mouseX, mouseY);

            // Handle mouse up for active tool
            if (this.panTool.isTracking()) {
                return this.panTool.onMouseUp(position.getX(), position.getY(), button);
            }

            if (this.onDocumentMouseUp(position.getX(), position.getY(), button, documentWorkspace,
                this.toDocumentPointerInput(documentWorkspace, input))) {
                return true;
            }
        }
        return false;
    }

    toToolDocumentPosition(documentWorkspace, mouseX, mouseY) {
        const tool = typeof this.getActiveTool === "function" ? this.getActiveTool() : null;
        const continuous = tool !== null
            && typeof tool.usesContinuousPointerCoordinates === "function"
            && tool.usesContinuousPointerCoordinates();
        return documentWorkspace.toDocumentPosition(new Point(mouseX, mouseY), continuous);
    }

    toDocumentPointerInput(documentWorkspace, input) {
        if (input === null || input === undefined) return null;
        return Object.assign({}, input, {
            samples: (input.samples || []).map(sample => {
                const point = documentWorkspace.toDocumentPosition(new Point(sample.x, sample.y));
                return Object.assign({}, sample, {x: point.x, y: point.y});
            })
        });
    }

    onDocumentKeyPress(key, documentWorkspace) {
        return false;
    }

    onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, input = null) {
        return false;
    }

    onDocumentMouseMove(mouseX, mouseY, documentWorkspace, input = null) {
        return false;
    }

    onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, input = null) {
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
        const workspace = this.getActiveDocumentWorkspace();
        return workspace !== null && workspace.isGridVisible();
    }

    isRulersVisible() {
        const workspace = this.getActiveDocumentWorkspace();
        return workspace !== null && workspace.isRulersVisible();
    }

    isControlKeyDown() {
        return this.controlKeyDown;
    }

    isShiftKeyDown() {
        return this.shiftKeyDown;
    }

    isAltKeyDown() {
        return this.altKeyDown;
    }

    setGridVisible(visible) {
        const activeDocumentWorkspace = this.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) return;
        activeDocumentWorkspace.setGridVisible(visible);

        this.fire("app:grid_visibility_changed", visible);
    }

    setRulersVisible(visible) {
        const activeDocumentWorkspace = this.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) return;
        activeDocumentWorkspace.setRulersVisible(visible);
        this.syncRulerVisibility();
        this.fire("app:rulers_visibility_changed", !!visible);
    }

    syncRulerVisibility() {
        this.rulersVisible = this.isRulersVisible();
        this.rulerRenderSignature = null;
        this.editor.classList.toggle("rulers-visible", this.rulersVisible);
        this.horizontalRuler.classList.toggle("visible", this.rulersVisible);
        this.verticalRuler.classList.toggle("visible", this.rulersVisible);
        this.rulerCorner.classList.toggle("visible", this.rulersVisible);

        // Paint.NET docks the rulers around the canvas. Recompute both the
        // canvas bounds and every anchored tool window against that inset.
        this.updateCanvasBounds(false);
        requestAnimationFrame(() => {
            for (const form of FormRegistry.list()) {
                const toolWindow = form.getWindow();
                if (toolWindow !== null && typeof toolWindow.applyAnchor === "function") {
                    toolWindow.applyAnchor();
                }
            }
        });
    }

    renderRulers(documentWorkspace) {
        if (!this.rulersVisible || documentWorkspace === null) return;

        const bounds = documentWorkspace.getRenderBounds();
        const zoom = documentWorkspace.getZoom();
        const signature = [
            this.getViewWidth(), this.getViewHeight(), bounds.x, bounds.y,
            bounds.width, bounds.height, zoom, this.getMeasurementUnit()
        ].join(":");
        if (signature === this.rulerRenderSignature) return;
        this.rulerRenderSignature = signature;

        this.drawRuler(this.horizontalRuler, bounds.x, zoom, false);
        this.drawRuler(this.verticalRuler, bounds.y, zoom, true);
    }

    drawRuler(canvas, documentStart, zoom, vertical) {
        const rulerSize = AppView.RULER_SIZE;
        const cssWidth = vertical ? rulerSize : Math.max(1, this.getViewWidth());
        const cssHeight = vertical ? Math.max(1, this.getViewHeight()) : rulerSize;
        const scale = window.devicePixelRatio || 1;
        canvas.width = Math.round(cssWidth * scale);
        canvas.height = Math.round(cssHeight * scale);
        canvas.style.width = cssWidth + "px";
        canvas.style.height = cssHeight + "px";

        const context = canvas.getContext("2d");
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.clearRect(0, 0, cssWidth, cssHeight);
        context.fillStyle = "#202020";
        context.fillRect(0, 0, cssWidth, cssHeight);
        context.strokeStyle = "#a8a8a8";
        context.fillStyle = "#e5e5e5";
        context.font = "10px Segoe UI, sans-serif";

        const available = vertical ? cssHeight : cssWidth;
        const start = documentStart;
        let pixelStep = 1;
        while (pixelStep * zoom < 35) pixelStep *= pixelStep === 2 ? 2.5 : 2;
        const first = Math.ceil((-start / zoom) / pixelStep) * pixelStep;
        const last = Math.floor(((available - start) / zoom) / pixelStep) * pixelStep;

        for (let value = first; value <= last; value += pixelStep) {
            const position = start + value * zoom;
            const label = String(this.toUnit(value));
            context.beginPath();
            if (vertical) {
                context.moveTo(rulerSize - 6, position + 0.5);
                context.lineTo(rulerSize, position + 0.5);
                context.save();
                context.translate(rulerSize - 9, position + 2);
                context.rotate(-Math.PI / 2);
                context.fillText(label, 0, 0);
                context.restore();
            } else {
                context.moveTo(position + 0.5, rulerSize - 6);
                context.lineTo(position + 0.5, rulerSize);
                context.fillText(label, position + 2, 10);
            }
            context.stroke();
        }
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

    handleError(error) {
        ErrorForm.report(error);
    }

}
