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

class Data {

    constructor() {
        this.basePath = new GraphicsPath();
        this.continuation = new GraphicsPath();
        this.continuationCombineMode = CombineMode.XOR;
        this.cumulativeTransform = new Matrix();
        this.cumulativeTransform.reset();
        this.interimTransform = new Matrix();
        this.interimTransform.reset();
    }

    clone() {
        let clone = new Data();
        clone.basePath = this.basePath.clone();
        clone.continuation = this.continuation.clone();
        clone.continuationCombineMode = this.continuationCombineMode;
        clone.cumulativeTransform = this.cumulativeTransform.clone();
        clone.interimTransform = this.interimTransform.clone();
        return clone;
    }

    dispose() {
        if (this.basePath !== null) {
            this.basePath.dispose();
            this.basePath = null;
        }

        if (this.continuation !== null) {
            this.continuation.dispose();
            this.continuation = null;
        }

        if (this.cumulativeTransform !== null) {
            this.cumulativeTransform.dispose();
            this.cumulativeTransform = null;
        }

        if (this.interimTransform !== null) {
            this.interimTransform.dispose();
            this.interimTransform = null;
        }
    }
}