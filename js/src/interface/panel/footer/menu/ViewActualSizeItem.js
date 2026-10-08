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

class ViewActualSizeItem extends IconItem {

    constructor() {
        super("menuViewActualSize", () => {
            this.toggleZoomBasis();
        });

        this.zoomToWindow = null;
        this.app.on("app:update_active_document", () => this.updateZoomBasis());
        this.app.on("document:update_viewport", () => this.updateZoomBasis());
        this.updateZoomBasis();
    }

    toggleZoomBasis() {
        const activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) return;

        if (activeDocumentWorkspace.isZoomToWindow()) {
            // Paint.NET's status-bar toggle switches from Fit to Window to 100%.
            activeDocumentWorkspace.setZoom(1);
        } else {
            activeDocumentWorkspace.setZoomToWindow(true);
        }
    }

    updateZoomBasis() {
        const activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        const zoomToWindow = activeDocumentWorkspace !== null
            && activeDocumentWorkspace.isZoomToWindow();
        if (this.zoomToWindow === zoomToWindow) return;

        this.zoomToWindow = zoomToWindow;
        const iconPathKey = this.zoomToWindow
            ? "menu_view_zoom_to_window_icon"
            : "menu_view_actual_size_icon";
        this.withIconPathKey(iconPathKey, true);

        // Updating the existing element avoids replacing the control while a
        // slider or wheel event is still being dispatched.
        if (this.element !== null) {
            const icon = this.element.querySelector("img");
            if (icon !== null) {
                icon.src = "assets/icons/" + iconPathKey + ".png";
                icon.title = this.getText();
            }
        }
    }

    getText() {
        return i18n(this.zoomToWindow
            ? "menu.view.zoomToWindow.text"
            : "menu.view.actualSize.text");
    }

    buildElement() {
        const element = super.buildElement();
        const icon = element.querySelector("img");
        if (icon !== null) icon.title = this.getText();
        return element;
    }

}
