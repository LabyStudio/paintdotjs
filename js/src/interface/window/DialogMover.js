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

class DialogMover {

    constructor(dialog, handle, boundsElement, persistenceId = null) {
        this.dialog = dialog;
        this.handle = handle;
        this.boundsElement = boundsElement;
        this.persistenceId = persistenceId;
        this.offsetX = 0;
        this.offsetY = 0;
        this.dragging = false;

        this.onMouseDown = event => this.start(event);
        this.onMouseMove = event => this.move(event);
        this.onMouseUp = () => this.stop();
        this.onResize = () => this.clampToBounds();

        this.handle.classList.add("movable-dialog-handle");
        this.handle.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("resize", this.onResize);

        if (this.persistenceId !== null && typeof AppSettingsStore !== "undefined") {
            const state = AppSettingsStore.get("dialogs." + this.persistenceId, null);
            if (Number.isFinite(state?.left) && Number.isFinite(state?.top)) {
                this.dialog.style.position = "fixed";
                this.setPosition(state.left, state.top);
            }
        }
    }

    start(event) {
        if (event.button !== 0 || event.target.closest("button, a, input, select, textarea")) {
            return;
        }

        const bounds = this.dialog.getBoundingClientRect();
        this.dialog.style.position = "fixed";
        this.dialog.style.left = bounds.left + "px";
        this.dialog.style.top = bounds.top + "px";
        this.offsetX = event.clientX - bounds.left;
        this.offsetY = event.clientY - bounds.top;
        this.dragging = true;

        document.addEventListener("mousemove", this.onMouseMove, true);
        document.addEventListener("mouseup", this.onMouseUp, true);
        event.preventDefault();
    }

    move(event) {
        if (!this.dragging) {
            return;
        }

        this.setPosition(event.clientX - this.offsetX, event.clientY - this.offsetY);
        event.preventDefault();
    }

    setPosition(left, top) {
        const bounds = this.boundsElement.getBoundingClientRect();
        const maxLeft = Math.max(bounds.left, bounds.right - this.dialog.offsetWidth);
        const maxTop = Math.max(bounds.top, bounds.bottom - this.dialog.offsetHeight);

        this.dialog.style.left = Math.max(bounds.left, Math.min(maxLeft, left)) + "px";
        this.dialog.style.top = Math.max(bounds.top, Math.min(maxTop, top)) + "px";
    }

    clampToBounds() {
        if (this.dialog.style.position !== "fixed") {
            return;
        }

        const bounds = this.dialog.getBoundingClientRect();
        this.setPosition(bounds.left, bounds.top);
    }

    stop() {
        if (this.dragging && this.persistenceId !== null
            && typeof AppSettingsStore !== "undefined") {
            const bounds = this.dialog.getBoundingClientRect();
            AppSettingsStore.set("dialogs." + this.persistenceId, {
                left: Math.round(bounds.left),
                top: Math.round(bounds.top)
            });
        }
        this.dragging = false;
        document.removeEventListener("mousemove", this.onMouseMove, true);
        document.removeEventListener("mouseup", this.onMouseUp, true);
    }

    destroy() {
        this.stop();
        this.handle.removeEventListener("mousedown", this.onMouseDown);
        this.handle.classList.remove("movable-dialog-handle");
        window.removeEventListener("resize", this.onResize);
    }
}
