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

class CompoundHistoryMemento extends HistoryMemento {

    constructor(name, image, actions) {
        super(name, image);

        this.actions = actions;
    }

    push(action) {
        this.actions.push(action);
    }

    onUndo() {
        let mementos = [];

        for (let i = this.actions.length - 1; i >= 0; i--) {
            let action = this.actions[i];
            let memento = action.performUndo();

            if (memento !== null) {
                mementos.push(memento);
            }
        }

        return new CompoundHistoryMemento(
            this.name,
            this.image,
            mementos
        );
    }

}