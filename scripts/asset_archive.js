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

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {Readable, Transform, Writable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const yauzl = require('yauzl');

async function sha256(filename) {
    const hash = crypto.createHash('sha256');
    await pipeline(
        fs.createReadStream(filename),
        new Transform({
            transform(chunk, _encoding, callback) {
                hash.update(chunk);
                callback(null, chunk);
            }
        }),
        new Writable({write(_chunk, _encoding, callback) { callback(); }})
    );
    return hash.digest('hex');
}

async function downloadArchive({url, destination, expectedSha256, onProgress = () => {}}) {
    if (fs.existsSync(destination)) {
        const cachedSha256 = await sha256(destination);
        if (!expectedSha256 || cachedSha256 === expectedSha256) {
            const size = fs.statSync(destination).size;
            onProgress({downloaded: size, total: size, cached: true});
            return cachedSha256;
        }
    }

    await fsp.mkdir(path.dirname(destination), {recursive: true});
    const temporary = `${destination}.part`;
    await fsp.rm(temporary, {force: true});
    const response = await fetch(url, {redirect: 'follow'});
    if (!response.ok || !response.body) {
        throw new Error(`Asset download failed (${response.status})`);
    }
    const total = Number(response.headers.get('content-length')) || 0;
    const hash = crypto.createHash('sha256');
    let downloaded = 0;
    const progress = new Transform({
        transform(chunk, _encoding, callback) {
            downloaded += chunk.length;
            hash.update(chunk);
            onProgress({downloaded, total, cached: false});
            callback(null, chunk);
        }
    });
    try {
        await pipeline(Readable.fromWeb(response.body), progress, fs.createWriteStream(temporary));
        const actualHash = hash.digest('hex');
        if (expectedSha256 && actualHash !== expectedSha256) {
            throw new Error(`Official asset archive checksum mismatch (received ${actualHash})`);
        }
        await fsp.rename(temporary, destination);
        return actualHash;
    } finally {
        await fsp.rm(temporary, {force: true});
    }
}

function extractArchive(archive, destination) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const fail = error => {
            if (settled) {
                return;
            }
            settled = true;
            reject(error instanceof Error ? error : new Error(String(error)));
        };
        yauzl.open(archive, {lazyEntries: true, autoClose: true}, (openError, zip) => {
            if (openError) {
                return fail(openError);
            }
            zip.on('error', fail);
            zip.on('end', () => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve();
            });
            zip.on('entry', entry => {
                const normalized = entry.fileName.replaceAll('\\', '/');
                const relative = path.posix.normalize(normalized);
                const unixType = (entry.externalFileAttributes >>> 16) & 0o170000;
                if (relative.startsWith('/') || relative === '..' || relative.startsWith('../')
                    || path.posix.isAbsolute(relative) || unixType === 0o120000) {
                    zip.close();
                    return fail(new Error(`Unsafe path in official archive: ${entry.fileName}`));
                }
                const target = path.join(destination, ...relative.split('/'));
                if (normalized.endsWith('/')) {
                    fs.mkdir(target, {recursive: true}, error => {
                        if (error) {
                            return fail(error);
                        }
                        zip.readEntry();
                    });
                    return;
                }
                fs.mkdir(path.dirname(target), {recursive: true}, mkdirError => {
                    if (mkdirError) {
                        return fail(mkdirError);
                    }
                    zip.openReadStream(entry, (streamError, stream) => {
                        if (streamError) {
                            return fail(streamError);
                        }
                        pipeline(stream, fs.createWriteStream(target))
                            .then(() => zip.readEntry())
                            .catch(fail);
                    });
                });
            });
            zip.readEntry();
        });
    });
}

module.exports = {downloadArchive, extractArchive, sha256};
