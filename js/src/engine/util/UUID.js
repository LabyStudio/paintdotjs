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

class UUID {

    constructor(mostSigBits, leastSigBits) {
        this.mostSigBits = BigInt(mostSigBits);
        this.leastSigBits = BigInt(leastSigBits);
    }

    toString() {
        return this.mostSigBits.toString(16).padStart(16, '0') + "-" +
            this.leastSigBits.toString(16).padStart(16, '0');
    }

    static randomUUID() {
        let mostSigBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        let leastSigBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        return new UUID(mostSigBits, leastSigBits);
    }
}