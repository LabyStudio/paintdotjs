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

class ViewZoomPercentageItem extends DropMenuItem {

    constructor() {
        super("zoomPercentageItem");

        this.textField = new TextFieldItem("zoomPercentageField");
        this.textField.setText(this.getText());
        this.textField.setAutoSelect(true);
        this.textField.setSubmitCallback(text => {
            this.close();
        });
        this.add(this.textField);

        this.app.on("document:update_viewport", rectangle => {
            this.updateText();
            this.textField.setText(this.getText());
        });
    }

    isDropUp() {
        return true;
    }

    close() {
        super.close();

        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return;
        }

        let zoom = parseInt(this.textField.getText().replace("%", ""));
        if (isNaN(zoom)) {
            return;
        }

        activeDocumentWorkspace.setZoom(zoom / 100);
    }

    getText() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return "100%";
        }
        return Math.round(activeDocumentWorkspace.getZoom() * 100) + "%";
    }
}