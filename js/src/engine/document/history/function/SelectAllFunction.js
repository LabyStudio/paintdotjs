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

class SelectAllFunction extends HistoryFunction {

    constructor() {
        super();
    }

    onExecute(documentWorkspace) {
        let selection = documentWorkspace.getSelection();

        let memento = new SelectionHistoryMemento(
            i18n("selectAllAction.name"),
            "assets/icons/menu_edit_select_all_icon.png",
            documentWorkspace
        );

        selection.push();
        selection.reset();
        selection.setContinuation(documentWorkspace.getDocument().getBounds(), CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();

        return memento;
    }

}