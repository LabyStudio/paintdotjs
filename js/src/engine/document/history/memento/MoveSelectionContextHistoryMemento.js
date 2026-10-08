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

class MoveSelectionContextHistoryMemento extends ToolHistoryMemento {

    constructor(documentWorkspace, context, name, image) {
        super(documentWorkspace, name, image);

        this.data = new OurHistoryMementoData(context);
    }

    onToolUndo() {
        let moveSelectionTool = this.app.getActiveTool();
        if (!(moveSelectionTool instanceof MoveSelectionTool)) {
            throw new Error("Current Tool is not the MoveSelectionTool");
        }

        let cha = new MoveSelectionContextHistoryMemento(
            this.documentWorkspace,
            moveSelectionTool.context,
            this.name,
            this.image
        );
        let ohad = this.data;
        let newContext = ohad.context;

        moveSelectionTool.context.dispose();
        moveSelectionTool.context = newContext;

        moveSelectionTool.destroyNubs();

        if (moveSelectionTool.context.lifted) {
            moveSelectionTool.positionNubs(moveSelectionTool.context.currentMode);
        }

        return cha;
    }
}