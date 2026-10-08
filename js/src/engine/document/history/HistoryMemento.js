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

class HistoryMemento {

    static nextId = 0;

    constructor(name, image) {
        this.name = name;
        this.image = image;
        this.data = null;

        this.id = HistoryMemento.nextId++;
    }

    onUndo() {
        throw new Error("Not implemented");
    }

    performUndo() {
        let memento = this.onUndo();
        memento.setId(this.getId());
        return memento;
    }

    getName() {
        return this.name;
    }

    getImage() {
        return this.image;
    }

    getId() {
        return this.id;
    }

    setId(id) {
        this.id = id;
    }

    setName(name) {
        this.name = name;
    }

    setImage(image) {
        this.image = image;
    }

}