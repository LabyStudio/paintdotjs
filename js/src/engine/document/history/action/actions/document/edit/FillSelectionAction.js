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

class FillSelectionAction extends EditAction {

    constructor(secondary = false) {
        super(
            secondary ? "fillSelectionSecondary" : "fillSelection",
            secondary ? "fillSelectionSecondary" : "fillSelection",
            null,
            secondary ? "Shift+Backspace" : "Backspace"
        );
        this.secondary = secondary;
    }

    performAction(documentWorkspace) {
        const colors = FormRegistry.get("colorsForm");
        if (colors === null) {
            return;
        }
        const color = this.secondary ? colors.secondaryColor : colors.mainColor;
        documentWorkspace.executeFunction(new FillSelectionFunction(
            color,
            i18n("menu.edit.fillSelection.text"),
            "assets/icons/menu_edit_fill_selection_icon.png"
        ));
    }

    isActionExecutable(documentWorkspace) {
        return !documentWorkspace.getSelection().isEmpty()
            && documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }
}
