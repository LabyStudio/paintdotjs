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

class InvertSelectionFunction extends HistoryFunction {

    static NAME = i18n("menu.edit.invertSelection.text");
    static IMAGE = "assets/icons/menu_edit_invert_selection_icon.png";

    onExecute(documentWorkspace) {
        const selection = documentWorkspace.getSelection();
        if (selection.isEmpty()) {
            return null;
        }

        const memento = new SelectionHistoryMemento(
            InvertSelectionFunction.NAME,
            InvertSelectionFunction.IMAGE,
            documentWorkspace
        );
        const currentPath = selection.createPath();
        const documentPath = new GraphicsPath();
        documentPath.addRectangle(documentWorkspace.getDocument().getBounds());
        const inversePath = GraphicsPath.combine(
            documentPath,
            CombineMode.EXCLUDE,
            currentPath
        );
        currentPath.dispose();
        documentPath.dispose();

        selection.push();
        selection.reset();
        selection.setContinuationPath(inversePath, CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();
        return memento;
    }
}
