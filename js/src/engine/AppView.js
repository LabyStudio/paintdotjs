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
        this.pointerDown = false;
        this.activePointerId = null;
        this.pointerButton = MouseButton.LEFT;
        this.autoScrollPointer = null;
        this.autoScrollFrame = null;
        this.lastAutoScrollTime = 0;

        this.controlKeyDown = false;
        this.shiftKeyDown = false;
        this.altKeyDown = false;

        this.panTool = null;
        this.listeners = {};
        this.cursorImages = new Map();
        this.cursorRequest = 0;
        this.cursorState = {type: "css", value: "default"};
        this.temporaryPanCursorState = null;

        this.gridVisible = typeof AppSettingsStore !== "undefined"
            && AppSettingsStore.get("workspace.showPixelGrid", false) === true;
        this.rulersVisible = typeof AppSettingsStore !== "undefined"
            && AppSettingsStore.get("workspace.showRulers", false) === true;
        this.rulerRenderSignature = null;
        this.lastViewWidth = null;
        this.lastViewHeight = null;
        this.renderDirty = true;

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

        const rememberAutoScrollPointer = event => {
            const point = getPointerPosition(event);
            this.autoScrollPointer = {
                clientX: event.clientX,
                clientY: event.clientY,
                x: point.x,
                y: point.y,
                pressure: point.pressure,
                pointerType: point.pointerType
            };
        };
        const finishInterruptedPointer = event => {
            if (!this.pointerDown) return;
            try {
                const point = event === null
                    ? this.autoScrollPointer
                    : getPointerPosition(event);
                if (point === null) return;
                const input = event === null ? {
                    pressure: point.pressure,
                    pointerType: point.pointerType,
                    samples: [point]
                } : getPointerInput(event);
                this.fire("document:mouseup", point.x, point.y, this.pointerButton);
                this.onMouseUp(point.x, point.y, this.pointerButton, input);
            } catch (error) {
                this.handleError(error);
            } finally {
                this.stopAutoScroll();
            }
        };

        // Pointer events retain pen pressure and the browser's coalesced input
        // samples. Paint.NET 5's brush pipeline consumes the same information
        // instead of reducing every device to a stream of mouse coordinates.
        this.editor.addEventListener('pointerdown', event => {
            if (this.pointerDown) {
                // Ignore additional touch/pen contacts while the active pointer
                // owns the stroke. A repeated down from the same pointer means
                // its previous up/cancel was lost, so finish that stroke first.
                if (event.pointerId !== this.activePointerId) {
                    event.preventDefault();
                    return;
                }
                finishInterruptedPointer(null);
            }
            try {
                const point = getPointerPosition(event);
                let x = point.x;
                let y = point.y;
                this.pointerDown = true;
                this.activePointerId = event.pointerId;
                this.pointerButton = event.button;
                rememberAutoScrollPointer(event);
                this.startAutoScroll();
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
            if (this.pointerDown && event.pointerId !== this.activePointerId) return;
            try {
                rememberAutoScrollPointer(event);

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
            if (!this.pointerDown || event.pointerId !== this.activePointerId) return;
            try {
                rememberAutoScrollPointer(event);
                const point = getPointerPosition(event);
                let x = point.x;
                let y = point.y;
                this.fire("document:mouseup", x, y, event.button);
                this.onMouseUp(x, y, event.button, getPointerInput(event));
            } catch (e) {
                this.handleError(e);
            } finally {
                this.stopAutoScroll();
            }

            event.preventDefault();
        });

        this.editor.addEventListener('pointercancel', event => {
            if (event.pointerId === this.activePointerId) finishInterruptedPointer(event);
        });
        this.editor.addEventListener('lostpointercapture', event => {
            if (this.pointerDown && event.pointerId === this.activePointerId) {
                finishInterruptedPointer(event);
            }
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
            let modifierChanged = false;
            if (event.key === "Control") {
                modifierChanged = !this.controlKeyDown;
                this.controlKeyDown = true;
            }
            if (event.key === "Shift") {
                modifierChanged = modifierChanged || !this.shiftKeyDown;
                this.shiftKeyDown = true;
            }
            if (event.key === "Alt") {
                modifierChanged = modifierChanged || !this.altKeyDown;
                this.altKeyDown = true;
            }
            if (modifierChanged) this.onModifierKeysChanged();

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
            let modifierChanged = false;
            if (event.key === "Control") {
                modifierChanged = this.controlKeyDown;
                this.controlKeyDown = false;
            }
            if (event.key === "Shift") {
                modifierChanged = modifierChanged || this.shiftKeyDown;
                this.shiftKeyDown = false;
            }
            if (event.key === "Alt") {
                modifierChanged = modifierChanged || this.altKeyDown;
                this.altKeyDown = false;
            }
            if (modifierChanged) this.onModifierKeysChanged();
        });
    }

    updateCanvasBounds(shiftView = true) {
        let documentWorkspace = this.getActiveDocumentWorkspace();
        this.view.style.overflow = documentWorkspace !== null
            && documentWorkspace.isZoomToWindow() ? "hidden" : "scroll";

        let viewWidth = this.getViewWidth();
        let viewHeight = this.getViewHeight();
        const previousViewWidth = this.lastViewWidth ?? viewWidth;
        const previousViewHeight = this.lastViewHeight ?? viewHeight;
        const displayScale = window.devicePixelRatio || 1;

        // The canvas is positioned in CSS pixels, but its backing surface must
        // use physical display pixels. Otherwise Chromium stretches a 1x
        // bitmap over a HiDPI viewport and soft brush edges are resampled a
        // second time by the browser compositor.
        this.canvas.setWidth(Math.max(1, Math.round(viewWidth * displayScale)));
        this.canvas.setHeight(Math.max(1, Math.round(viewHeight * displayScale)));
        const canvasElement = this.canvas.getCanvas();
        canvasElement.style.width = viewWidth + "px";
        canvasElement.style.height = viewHeight + "px";
        this.canvas.getContext().setTransform(displayScale, 0, 0, displayScale, 0, 0);

        if (documentWorkspace === null) {
            this.lastViewWidth = viewWidth;
            this.lastViewHeight = viewHeight;
            return;
        }

        let envWidth = documentWorkspace.getEnvironmentWidth();
        let envHeight = documentWorkspace.getEnvironmentHeight();

        // Resize the scrollable area before applying its new scroll position.
        // When a window grows, the centered position may be outside the old
        // environment's scroll range. Setting it first makes Chromium clamp
        // it to that old range, leaving the document near a corner once the
        // environment is enlarged.
        this.environment.style.width = envWidth + "px";
        this.environment.style.height = envHeight + "px";

        // Preserve the document-space point at the center of the viewport.
        // The environment is deliberately larger than both the viewport and
        // the document, so half of its size delta is not the viewport delta.
        // Account only for the viewport change and for the part of the image
        // that participates in getRenderBounds().
        if (shiftView) {
            const renderWidth = documentWorkspace.getRenderWidth();
            const renderHeight = documentWorkspace.getRenderHeight();
            const oldVisibleWidth = Math.min(renderWidth, previousViewWidth);
            const oldVisibleHeight = Math.min(renderHeight, previousViewHeight);
            const newVisibleWidth = Math.min(renderWidth, viewWidth);
            const newVisibleHeight = Math.min(renderHeight, viewHeight);
            documentWorkspace.shiftViewPosition(
                ((viewWidth - previousViewWidth) - (newVisibleWidth - oldVisibleWidth)) / 2,
                ((viewHeight - previousViewHeight) - (newVisibleHeight - oldVisibleHeight)) / 2
            );
        }

        this.lastViewWidth = viewWidth;
        this.lastViewHeight = viewHeight;
    }

    render() {
        requestAnimationFrame(() => this.render());

        const documentWorkspace = this.getActiveDocumentWorkspace();
        const selectionRenderer = documentWorkspace?.getSelectionRenderer?.();
        const animationActive = selectionRenderer?.isAnimationActive?.() === true;
        if (!this.renderDirty && !animationActive) return;

        // Clear this before painting so an invalidation raised during the draw
        // is retained for the following frame.
        this.renderDirty = false;

        if (documentWorkspace !== null) {
            let renderBounds = documentWorkspace.getRenderBounds();
            documentWorkspace.render(this.canvas, renderBounds);
        }
        this.renderRulers(documentWorkspace);
    }

    invalidateRender() {
        this.renderDirty = true;
    }

    setCursor(cursor) {
        this.cursorState = {type: "css", value: cursor};
        ++this.cursorRequest;
        if (this.editor.style.cursor === cursor) {
            return;
        }
        this.editor.style.cursor = cursor;
    }

    setCursorImg(name) {
        this.cursorState = {type: "image", value: name};
        const request = ++this.cursorRequest;
        const cached = this.cursorImages.get(name);
        if (cached !== undefined && !(cached instanceof Promise)) {
            this.editor.style.cursor = this.cursorCss(cached.url, cached.hotspot);
            return;
        }

        // Extracted Paint.NET cursors contain an extra metadata row and column.
        // Their two red edge pixels encode the native x/y hotspot. Decode and
        // crop that metadata before handing the image to the browser.
        if (cached instanceof Promise) {
            cached.then(cursor => {
                if (request === this.cursorRequest) {
                    this.editor.style.cursor = this.cursorCss(cursor.url, cursor.hotspot);
                }
            });
            return;
        }

        const source = "assets/cursors/" + name + ".png";
        const fallbackHotspot = /^hand_/.test(name) ? [15, 15] : [16, 16];
        const loading = this.cleanCursorImage(source)
            .catch(() => ({url: source, hotspot: fallbackHotspot}));
        this.cursorImages.set(name, loading);
        loading.then(cursor => {
            this.cursorImages.set(name, cursor);
            if (request === this.cursorRequest) {
                this.editor.style.cursor = this.cursorCss(cursor.url, cursor.hotspot);
            }
        });
    }

    cursorCss(url, hotspot) {
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
                let hotspotX = null;
                let hotspotY = null;

                for (let offset = 0; offset < pixels.data.length; offset += 4) {
                    if (pixels.data[offset] === 255
                        && pixels.data[offset + 1] === 0
                        && pixels.data[offset + 2] === 0
                        && pixels.data[offset + 3] !== 0) {
                        const pixel = offset / 4;
                        const x = pixel % canvas.width;
                        const y = Math.floor(pixel / canvas.width);
                        if (x === canvas.width - 1) hotspotY = y;
                        if (y === canvas.height - 1) hotspotX = x;
                        pixels.data[offset + 3] = 0;
                    }
                }

                context.putImageData(pixels, 0, 0);
                const hasMetadata = hotspotX !== null && hotspotY !== null;
                const cleanCanvas = document.createElement("canvas");
                cleanCanvas.width = canvas.width - (hasMetadata ? 1 : 0);
                cleanCanvas.height = canvas.height - (hasMetadata ? 1 : 0);
                cleanCanvas.getContext("2d").drawImage(canvas, 0, 0);
                resolve({
                    url: cleanCanvas.toDataURL("image/png"),
                    hotspot: hasMetadata
                        ? [hotspotX, hotspotY]
                        : [Math.floor(cleanCanvas.width / 2), Math.floor(cleanCanvas.height / 2)]
                });
            };
            image.onerror = reject;
            image.src = source;
        });
    }

    onResize(width, height) {
        this.updateCanvasBounds();

        // TODO change logic after implementing movement of the document
        let documentWorkspace = this.getActiveDocumentWorkspace();
        if (documentWorkspace !== null && documentWorkspace.isZoomToWindow()) {
            documentWorkspace.fitViewport();
        }

        this.fire("app:resize", width, height);
    }

    startAutoScroll() {
        this.lastAutoScrollTime = performance.now();
        if (this.autoScrollFrame !== null) return;
        this.autoScrollFrame = requestAnimationFrame(time => this.runAutoScrollFrame(time));
    }

    stopAutoScroll() {
        this.pointerDown = false;
        this.activePointerId = null;
        this.autoScrollPointer = null;
        if (this.autoScrollFrame !== null) cancelAnimationFrame(this.autoScrollFrame);
        this.autoScrollFrame = null;
    }

    runAutoScrollFrame(time) {
        this.autoScrollFrame = null;
        if (!this.pointerDown || this.autoScrollPointer === null) return;

        const elapsedSeconds = Math.min(Math.max((time - this.lastAutoScrollTime) / 1000, 0), 0.1);
        this.lastAutoScrollTime = time;
        this.autoScrollIfNecessary(elapsedSeconds);
        this.autoScrollFrame = requestAnimationFrame(nextTime => this.runAutoScrollFrame(nextTime));
    }

    autoScrollIfNecessary(elapsedSeconds) {
        const enabled = typeof AppSettingsStore === "undefined"
            || AppSettingsStore.get("ui.autoScrollWhileDrawing", true);
        const documentWorkspace = this.getActiveDocumentWorkspace();
        const activeTool = this.getActiveTool();
        if (!enabled || elapsedSeconds <= 0 || documentWorkspace === null
            || documentWorkspace.isZoomToWindow() || activeTool === null
            || !activeTool.isActive() || this.panTool.isTracking()) return false;

        const pointer = this.autoScrollPointer;
        const viewportBounds = this.view.getBoundingClientRect();
        const centerX = (viewportBounds.left + viewportBounds.right) / 2;
        const centerY = (viewportBounds.top + viewportBounds.bottom) / 2;
        // Paint.NET projects the pointer 2% farther from the viewport center.
        // This starts scrolling just before the pointer reaches an edge.
        const projectedX = centerX + (pointer.clientX - centerX) * 1.02;
        const projectedY = centerY + (pointer.clientY - centerY) * 1.02;
        const directionX = projectedX < viewportBounds.left
            ? -1
            : (projectedX > viewportBounds.right ? 1 : 0);
        const directionY = projectedY < viewportBounds.top
            ? -1
            : (projectedY > viewportBounds.bottom ? 1 : 0);
        if (directionX === 0 && directionY === 0) return false;

        const speed = 2000;
        let deltaX = directionX * speed * elapsedSeconds;
        let deltaY = directionY * speed * elapsedSeconds;
        const maxScrollX = Math.max(0, this.view.scrollWidth - this.view.clientWidth);
        const maxScrollY = Math.max(0, this.view.scrollHeight - this.view.clientHeight);
        deltaX = Utility.clamp(deltaX, -this.getViewX(), maxScrollX - this.getViewX());
        deltaY = Utility.clamp(deltaY, -this.getViewY(), maxScrollY - this.getViewY());
        if (deltaX === 0 && deltaY === 0) return false;

        const oldX = this.getViewX();
        const oldY = this.getViewY();
        this.view.scrollBy(deltaX, deltaY);
        const newX = this.getViewX();
        const newY = this.getViewY();
        if (newX === oldX && newY === oldY) return false;

        // Synchronize the document transform before re-emitting the stationary
        // pointer. Its document coordinate changes as the viewport moves.
        documentWorkspace.setViewPosition(newX, newY);
        const input = {
            pressure: pointer.pressure,
            pointerType: pointer.pointerType,
            samples: [{
                x: pointer.x,
                y: pointer.y,
                pressure: pointer.pressure,
                pointerType: pointer.pointerType,
                timeStamp: performance.now()
            }]
        };
        this.fire("document:mousemove", pointer.x, pointer.y);
        this.onMouseMove(pointer.x, pointer.y, input);
        return true;
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
                this.temporaryPanCursorState = Object.assign({}, this.cursorState);
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
                const handled = this.panTool.onMouseUp(position.getX(), position.getY(), button);
                const cursorState = this.temporaryPanCursorState;
                this.temporaryPanCursorState = null;
                if (handled && cursorState !== null) {
                    if (cursorState.type === "image") {
                        this.setCursorImg(cursorState.value);
                    } else {
                        this.setCursor(cursorState.value);
                    }
                }
                return handled;
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
        const tool = typeof this.getActiveTool === "function" ? this.getActiveTool() : null;
        const continuous = tool !== null
            && typeof tool.usesContinuousPointerCoordinates === "function"
            && tool.usesContinuousPointerCoordinates();
        return Object.assign({}, input, {
            samples: (input.samples || []).map(sample => {
                const point = documentWorkspace.toDocumentPosition(
                    new Point(sample.x, sample.y), continuous);
                return Object.assign({}, sample, {x: point.x, y: point.y});
            })
        });
    }

    onDocumentKeyPress(key, documentWorkspace) {
        return false;
    }

    onModifierKeysChanged() {

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
        return this.getActiveDocumentWorkspace() !== null && this.gridVisible;
    }

    isRulersVisible() {
        return this.getActiveDocumentWorkspace() !== null && this.rulersVisible;
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
        visible = !!visible;
        this.gridVisible = visible;
        activeDocumentWorkspace.setGridVisible(visible);
        if (typeof AppSettingsStore !== "undefined") {
            AppSettingsStore.set("workspace.showPixelGrid", visible);
        }

        this.fire("app:grid_visibility_changed", visible);
    }

    setRulersVisible(visible) {
        const activeDocumentWorkspace = this.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) return;
        visible = !!visible;
        this.rulersVisible = visible;
        activeDocumentWorkspace.setRulersVisible(visible);
        if (typeof AppSettingsStore !== "undefined") {
            AppSettingsStore.set("workspace.showRulers", visible);
        }
        this.syncRulerVisibility();
        this.fire("app:rulers_visibility_changed", visible);
    }

    syncRulerVisibility() {
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
        const resolution = documentWorkspace.getDocument().getResolution();
        const signature = [
            this.getViewWidth(), this.getViewHeight(), bounds.x, bounds.y,
            bounds.width, bounds.height, zoom, this.getMeasurementUnit(), resolution
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

    off(event, callback) {
        if (typeof this.listeners[event] === "undefined") return;
        const index = this.listeners[event].indexOf(callback);
        if (index !== -1) this.listeners[event].splice(index, 1);
    }

    fire(event, ...args) {
        // Canvas renderers are fed by application events (document changes,
        // tool input, viewport movement, settings, etc.). Marking the next
        // frame here coalesces any number of changes into one redraw instead
        // of repainting the full viewport continuously while the app is idle.
        this.invalidateRender();
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
