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

class PdjInfo {

    static version() {
        const version = typeof window.PDJVERSION === 'string' ? window.PDJVERSION : 'Unknown version';
        return this.formatVersion(version);
    }

    static formatVersion(version) {
        const distribution = this.distribution();
        return distribution === null ? version : `${version} (${distribution})`;
    }

    static distribution() {
        return typeof window.PDJDISTRIBUTION === 'string' && window.PDJDISTRIBUTION.length > 0
            ? window.PDJDISTRIBUTION
            : null;
    }

    static productName() {
        return "paint.js";
    }
}
