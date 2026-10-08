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

class FileSystem {

    static _platform = null;

    getTempDirectory() {
        throw new Error("Not implemented");
    }

    async getTempFile() {
        let tempDirectory = this.getTempDirectory();
        for (let i = 0; i < 100; i++) {
            let ordinal = Math.floor(Math.random() * 1000000);
            let file = File.of(tempDirectory, ordinal);
            if (!await file.exists()) {
                return file;
            }
        }
        throw new Error("Failed to get temp file");
    }

    static getPlatform() {
        if (FileSystem._platform === null) {
            FileSystem._platform = isApp ? new AppFileSystem() : new WebFileSystem();
        }
        return FileSystem._platform;
    }

}