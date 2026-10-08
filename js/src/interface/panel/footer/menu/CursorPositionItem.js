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

class CursorPositionItem extends LabelMenuItem {

    constructor() {
        super("cursorPositionItem");

        this.withIconPathKey("cursor_x_y_icon", true);

        this.app.on("document:mousemove", (x, y) => {
            this.updateText(this.getText());
        });

        this.app.on("app:update_active_document", () => {
            this.updateText(this.getText());
        });

        this.app.on("app:update_measurement_unit", () => {
            this.updateText(this.getText());
        });
    }

    getText() {
        let documentWorkspace = this.app.getActiveDocumentWorkspace();
        if (documentWorkspace === null) {
            return "0, 0";
        }

        let mouseX = this.app.getLastMouseX();
        let mouseY = this.app.getLastMouseY();

        let position = documentWorkspace.toDocumentPosition(new Point(mouseX, mouseY));

        return this.app.toUnit(position.getX()) + ", " + this.app.toUnit(position.getY());
    }

}
