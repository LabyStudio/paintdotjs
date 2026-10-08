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

class MoveToolContext extends MoveToolBaseContext {

    constructor() {
        super();

        this.liftedPixels = null;
        this.poLiftedPixels = null;
        this.copying = false;
        this.previewBounds = null;
    }

    clone() {
        const base = super.clone();
        const clone = new MoveToolContext();
        Object.assign(clone, base);
        clone.liftedPixels = this.liftedPixels === null ? null : this.liftedPixels.clone();
        clone.poLiftedPixels = this.poLiftedPixels;
        clone.copying = this.copying;
        clone.previewBounds = this.previewBounds === null ? null : this.previewBounds.clone();
        return clone;
    }

    dispose() {
        if (this.liftedPixels !== null) {
            this.liftedPixels.dispose();
            this.liftedPixels = null;
        }
        if (this.baseTransform !== null) {
            this.baseTransform.dispose();
        }
        if (this.liftTransform !== null) {
            this.liftTransform.dispose();
        }
        if (this.deltaTransform !== null) {
            this.deltaTransform.dispose();
        }
        if (this.startPath !== null) {
            this.startPath.dispose();
        }
    }

}
