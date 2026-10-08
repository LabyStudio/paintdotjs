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

class MoveToolBaseContext {

    constructor() {
        this.lifted = false;
        this.seriesGuid = null;
        this.baseTransform = null; // a copy of the selection's interim transform at the time of mouse-down
        this.liftTransform = null; // a copy of the selection's interim transform at the time of lifting
        this.deltaTransform = null; // the transformations made since lifting
        this.liftedBounds = null;
        this.startBounds = null;
        this.startAngle = 0;
        this.startPath = null;
        this.currentMode = null;
        this.startEdge = null;
        this.startMouseXY = null;
        this.offset = null;
    }

    getMatrixElements(matrix) {
        if (matrix === null) {
            return null;
        } else {
            return matrix.getElements();
        }
    }

    clone() {
        let clone = new MoveToolBaseContext();
        clone.lifted = this.lifted;
        clone.seriesGuid = this.seriesGuid;
        if (this.baseTransform !== null) {
            clone.baseTransform = this.baseTransform.clone();
        }
        if (this.liftTransform !== null) {
            clone.liftTransform = this.liftTransform.clone();
        }
        if (this.deltaTransform !== null) {
            clone.deltaTransform = this.deltaTransform.clone();
        }

        clone.liftedBounds = this.liftedBounds;
        clone.startBounds = this.startBounds;
        clone.startAngle = this.startAngle;

        if (this.startPath !== null) {
            clone.startPath = this.startPath.clone();
        }

        clone.currentMode = this.currentMode;
        clone.startEdge = this.startEdge;

        clone.startMouseXY = this.startMouseXY;
        clone.offset = this.offset;

        return clone;
    }

    dispose() {
        // TODO dispose
    }
}
