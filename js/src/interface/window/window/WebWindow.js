/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class WebWindow extends AbstractWindow {

    constructor(persistenceId = null) {
        super();

        this.persistenceId = persistenceId;
        this.persistenceEnabled = false;
        this.persistenceTimer = null;

        this.overlay = document.getElementById("windowOverlay");
        this.view = document.getElementById("view");

        this.title = "Untitled Window";
        this.content = null;

        this.windowElement = null;
        this.titleBarElement = null;
        this.titleElement = null;
        this.closeButtonElement = null;
        this.contentElement = null;

        this.dragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.resizable = false;
        this.resizing = false;
        this.resizeDirection = null;
        this.resizeStart = null;
        this.minWidth = 120;
        this.minHeight = 90;

        this.x = 0;
        this.y = 0;

        this.anchorX = 0;
        this.anchorY = 0;

        this.updateImageOverlap = this.updateImageOverlap.bind(this);

        window.addEventListener("resize", () => {
            this.applyAnchor();
        });

        for (const event of ["app:update_active_document", "document:update_viewport", "app:resize"]) {
            this.app.on(event, this.updateImageOverlap);
        }
    }

    create() {
        WebWindow.ensureFocusTracking();

        // Window frame
        this.windowElement = document.createElement("div");
        this.windowElement.className = "window";
        this.windowElement.style.width = this.width + "px";
        this.windowElement.style.height = this.height + "px";
        this.windowElement.style.left = this.x + "px";
        this.windowElement.style.top = this.y + "px";
        {
            // Title bar
            this.titleBarElement = document.createElement("div");
            this.titleBarElement.className = "title-bar";
            this.windowElement.appendChild(this.titleBarElement);
            {
                // Title
                this.titleElement = document.createElement("div");
                this.titleElement.className = "title";
                this.titleElement.innerHTML = this.title;
                this.titleBarElement.appendChild(this.titleElement);

                // Close button
                this.closeButtonElement = document.createElement("button");
                this.closeButtonElement.className = "window-close-button";
                this.closeButtonElement.innerHTML = "x";
                this.closeButtonElement.onclick = () => this.close();
                this.titleBarElement.appendChild(this.closeButtonElement);
            }

            // Content
            this.contentElement = document.createElement("div");
            this.contentElement.className = "content";
            if (this.content !== null) {
                this.contentElement.appendChild(this.content);
            }
            this.windowElement.appendChild(this.contentElement);

            if (this.resizable) this.createResizeHandles();
        }
        this.overlay.appendChild(this.windowElement);
        WebWindow.focus(this.windowElement);
        this.updateImageOverlap();

        // Window movement handling
        this.titleBarElement.addEventListener("mousedown", (event) => {
            this.dragging = true;
            this.dragStartX = event.clientX - this.x;
            this.dragStartY = event.clientY - this.y;

            event.preventDefault();
            event.stopPropagation();
        });
        document.addEventListener("mousemove", (event) => {
            if (this.resizing) {
                this.resizeToPointer(event.clientX, event.clientY);

                event.preventDefault();
                event.stopPropagation();
            } else if (this.dragging) {
                let x = event.clientX - this.dragStartX;
                let y = event.clientY - this.dragStartY;

                this.setPositionAligned(x, y);

                event.preventDefault();
                event.stopPropagation();
            }
        });
        document.addEventListener("mouseup", () => {
            this.dragging = false;
            this.resizing = false;
            this.resizeDirection = null;
            this.resizeStart = null;
            document.body.classList.remove("window-resizing");
            this.saveState(true);
        });

        super.create();
        this.saveState(true);
    }

    restoreState() {
        if (this.persistenceId === null || typeof AppSettingsStore === "undefined") return true;
        const state = AppSettingsStore.get("windows." + this.persistenceId, null);
        if (state === null || typeof state !== "object") return true;

        if (Number.isFinite(state.width) && state.width > 0) this.width = state.width;
        if (Number.isFinite(state.height) && state.height > 0) this.height = state.height;
        if (Number.isFinite(state.anchorX)) this.anchorX = state.anchorX;
        if (Number.isFinite(state.anchorY)) this.anchorY = state.anchorY;
        this.applyAnchor();
        return state.visible !== false;
    }

    enablePersistence() {
        this.persistenceEnabled = true;
    }

    notifyOpenState() {
        this.app.fire("app:window_open_state_changed", this, this.open);
    }

    saveState(immediate = false) {
        if (!this.persistenceEnabled || this.persistenceId === null
            || typeof AppSettingsStore === "undefined") return;
        if (!immediate) {
            clearTimeout(this.persistenceTimer);
            this.persistenceTimer = setTimeout(() => {
                this.persistenceTimer = null;
                this.saveState(true);
            }, 100);
            return;
        }
        clearTimeout(this.persistenceTimer);
        this.persistenceTimer = null;
        const previous = AppSettingsStore.get("windows." + this.persistenceId, {});
        AppSettingsStore.set("windows." + this.persistenceId, Object.assign({}, previous, {
            visible: this.open,
            width: this.width,
            height: this.height,
            anchorX: this.anchorX,
            anchorY: this.anchorY
        }));
    }

    static ensureFocusTracking() {
        if (WebWindow.focusTrackingInstalled) return;
        WebWindow.focusTrackingInstalled = true;

        const updateFocusedWindow = target => {
            const focusedWindow = target instanceof Element ? target.closest(".window") : null;
            WebWindow.focus(focusedWindow);
        };

        // Capture the event before title-bar dragging stops propagation.
        document.addEventListener("mousedown", event => updateFocusedWindow(event.target), true);
        document.addEventListener("focusin", event => updateFocusedWindow(event.target), true);
    }

    static focus(focusedWindow) {
        for (const windowElement of document.querySelectorAll(".window")) {
            windowElement.classList.toggle("window-focused", windowElement === focusedWindow);
        }
    }

    setTitle(title) {
        this.title = title;

        if (this.titleElement !== null) {
            this.titleElement.innerHTML = title;
        }
    }

    setContent(content) {
        this.content = content;

        if (this.contentElement !== null) {
            this.contentElement.innerHTML = "";
            this.contentElement.appendChild(content);
        }
    }

    setResizable(resizable, minWidth = 120, minHeight = 90) {
        this.resizable = !!resizable;
        this.minWidth = minWidth;
        this.minHeight = minHeight;
        if (this.windowElement !== null) {
            this.windowElement.classList.toggle("window-resizable", this.resizable);
            for (const handle of this.windowElement.querySelectorAll(".window-resize-handle")) {
                handle.remove();
            }
            if (this.resizable) this.createResizeHandles();
        }
    }

    createResizeHandles() {
        if (this.windowElement === null) return;
        this.windowElement.classList.add("window-resizable");
        for (const direction of ["n", "e", "s", "w", "ne", "se", "sw", "nw"]) {
            const handle = document.createElement("div");
            handle.className = "window-resize-handle window-resize-" + direction;
            handle.addEventListener("mousedown", event => {
                if (event.button !== 0) return;
                this.dragging = false;
                this.resizing = true;
                this.resizeDirection = direction;
                this.resizeStart = {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    x: this.x,
                    y: this.y,
                    width: this.width,
                    height: this.height
                };
                document.body.classList.add("window-resizing");
                WebWindow.focus(this.windowElement);
                event.preventDefault();
                event.stopPropagation();
            });
            this.windowElement.appendChild(handle);
        }
    }

    resizeToPointer(clientX, clientY) {
        if (!this.resizing || this.resizeStart === null) return;
        const start = this.resizeStart;
        const direction = this.resizeDirection;
        const deltaX = clientX - start.clientX;
        const deltaY = clientY - start.clientY;
        let x = start.x;
        let y = start.y;
        let width = start.width;
        let height = start.height;

        if (direction.includes("e")) width = start.width + deltaX;
        if (direction.includes("s")) height = start.height + deltaY;
        if (direction.includes("w")) {
            width = start.width - deltaX;
            x = start.x + deltaX;
        }
        if (direction.includes("n")) {
            height = start.height - deltaY;
            y = start.y + deltaY;
        }

        width = Math.max(this.minWidth, width);
        height = Math.max(this.minHeight, height);
        if (direction.includes("w")) x = start.x + start.width - width;
        if (direction.includes("n")) y = start.y + start.height - height;

        const overlayWidth = this.overlay.clientWidth;
        const overlayHeight = this.overlay.clientHeight;
        if (x < 0) {
            width += x;
            x = 0;
        }
        if (y < 0) {
            height += y;
            y = 0;
        }
        width = Math.max(this.minWidth, Math.min(width, overlayWidth - x));
        height = Math.max(this.minHeight, Math.min(height, overlayHeight - y));

        this.setSize(Math.round(width), Math.round(height));
        this.setPosition(Math.round(x), Math.round(y));
    }

    setSize(width, height) {
        if (this.resizable) {
            width = Math.max(this.minWidth, width);
            height = Math.max(this.minHeight, height);
        }
        this.width = width;
        this.height = height;

        if (this.windowElement !== null) {
            this.windowElement.style.width = width + "px";
            this.windowElement.style.height = height + "px";
            this.updateImageOverlap();
        }
        this.saveState();
    }

    setPosition(x, y) {
        // Clamp
        x = Math.max(0, Math.min(this.overlay.clientWidth - this.width, x));
        y = Math.max(0, Math.min(this.overlay.clientHeight - this.height, y));

        this.x = x;
        this.y = y;

        let viewBounds = this.getViewBounds();
        this.anchorX = (x - viewBounds.getLeft()) / (viewBounds.getRight() - this.width - viewBounds.getLeft());
        this.anchorY = (y - viewBounds.getTop()) / (viewBounds.getBottom() - this.height - viewBounds.getTop());

        if (this.windowElement !== null) {
            this.windowElement.style.left = x + "px";
            this.windowElement.style.top = y + "px";
            this.updateImageOverlap();
        }
        this.saveState();
    }

    updateImageOverlap() {
        if (this.windowElement === null) return;
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            this.windowElement.classList.remove("window-over-image");
            return;
        }

        const renderBounds = workspace.getRenderBounds();
        const editorBounds = document.getElementById("editor").getBoundingClientRect();
        const overlayBounds = this.overlay.getBoundingClientRect();
        const imageLeft = editorBounds.left - overlayBounds.left + renderBounds.getX();
        const imageTop = editorBounds.top - overlayBounds.top + renderBounds.getY();
        const imageRight = imageLeft + renderBounds.getWidth();
        const imageBottom = imageTop + renderBounds.getHeight();
        const windowRight = this.x + this.width;
        const windowBottom = this.y + this.height;
        const overlaps = this.x < imageRight && windowRight > imageLeft
            && this.y < imageBottom && windowBottom > imageTop;
        this.windowElement.classList.toggle("window-over-image", overlaps);
    }

    setPositionAligned(x, y) {
        let threshold = 15;
        let border = this.getViewBounds();

        // Align to border
        if (Math.abs(x - border.getLeft()) < threshold) {
            x = border.getLeft();
        }
        if (Math.abs(y - border.getTop()) < threshold) {
            y = border.getTop();
        }
        if (Math.abs(x + this.width - border.getRight()) < threshold) {
            x = border.getRight() - this.width;
        }
        if (Math.abs(y + this.height - border.getBottom()) < threshold) {
            y = border.getBottom() - this.height;
        }

        // Add alignment rectangles of other windows
        let alignmentRectangles = [];
        for (let form of FormRegistry.list()) {
            let window = form.getWindow();
            if (window === this) {
                continue
            }
            alignmentRectangles.push(window.getBounds());
        }

        // Align to other windows
        for (let rectangle of alignmentRectangles) {
            if (Math.abs(x + this.width - rectangle.getLeft()) < threshold) {
                x = rectangle.getLeft() - this.width - threshold / 2;
            }
            if (Math.abs(y + this.height - rectangle.getTop()) < threshold) {
                y = rectangle.getTop() - this.height - threshold / 2;
            }
            if (Math.abs(x - rectangle.getRight()) < threshold) {
                x = rectangle.getRight() + threshold / 2;
            }
            if (Math.abs(y - rectangle.getBottom()) < threshold) {
                y = rectangle.getBottom() + threshold / 2;
            }
        }
        this.setPosition(x, y);
    }

    setAnchor(x, y) {
        this.anchorX = x;
        this.anchorY = y;

        this.applyAnchor();
    }

    applyAnchor() {
        let viewBounds = this.getViewBounds();

        this.setPosition(
            viewBounds.getLeft() + this.anchorX * (viewBounds.getRight() - this.width - viewBounds.getLeft()),
            viewBounds.getTop() + this.anchorY * (viewBounds.getBottom() - this.height - viewBounds.getTop())
        );
    }

    close() {
        this.overlay.removeChild(this.windowElement);
        this.windowElement = null;

        super.close();
        this.saveState(true);
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getViewBounds() {
        let viewBounds = this.view.getBoundingClientRect();
        let overlayBounds = this.overlay.getBoundingClientRect();
        let margin = 10;
        return Rectangle.relative(
            viewBounds.x - overlayBounds.x + margin,
            viewBounds.y - overlayBounds.y + margin,
            this.view.clientWidth - margin * 2,
            this.view.clientHeight - margin * 2
        );
    }

    getBounds() {
        return Rectangle.relative(this.x, this.y, this.width, this.height);
    }
}

WebWindow.focusTrackingInstalled = false;
