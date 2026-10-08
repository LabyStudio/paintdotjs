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

class CanvasSizeItem extends LabelMenuItem {

    constructor() {
        super("canvasSizeItem");

        this.withIconPathKey("image_size_icon", true);

        this.app.on("document:update_size", (width, height) => {
            this.updateText(this.getText());
        });

        this.app.on("app:update_active_document", documentWorkspace => {
            this.updateText(this.getText());
        });

        this.app.on("app:update_measurement_unit", unit => {
            this.updateText(this.getText());
        });
    }

    getText() {
        let documentWorkspace = this.app.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return "0 x 0";
        }

        return this.app.toUnit(documentWorkspace.getWidth()) + " x " + this.app.toUnit(documentWorkspace.getHeight());
    }

}