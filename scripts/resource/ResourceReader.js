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

class ResourceReader {
    constructor(buffer, filename) {
        this.buffer = buffer;
        this.filename = filename;
        this.offset = 0;
    }

    require(length) {
        if (this.offset + length > this.buffer.length) {
            throw new Error(`Unexpected end of .resources file: ${this.filename}`);
        }
    }

    bytes(length) {
        this.require(length);
        const value = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    int32() {
        this.require(4);
        const value = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    uint32() {
        this.require(4);
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    sevenBitInt() {
        let value = 0;
        for (let shift = 0; shift < 35; shift += 7) {
            const byte = this.bytes(1)[0];
            value |= (byte & 0x7f) << shift;
            if (byte < 0x80) {
                return value >>> 0;
            }
        }
        throw new Error(`Invalid 7-bit integer in ${this.filename}`);
    }

    string(encoding = 'utf8') {
        return this.bytes(this.sevenBitInt()).toString(encoding);
    }

    seek(offset, relative = false) {
        this.offset = relative ? this.offset + offset : offset;
        if (this.offset < 0 || this.offset > this.buffer.length) {
            throw new Error(`Invalid seek in ${this.filename}`);
        }
    }
}

module.exports = ResourceReader;
