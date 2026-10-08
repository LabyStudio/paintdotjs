#!/usr/bin/env node
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
const path = require('node:path');
const ResourceReader = require('./resource/ResourceReader');

function readStringResources(filename) {
    const reader = new ResourceReader(fs.readFileSync(filename), filename);
    if (reader.uint32() !== 0xbeefcace) {
        throw new Error(`Not a .NET resources file: ${filename}`);
    }
    if (reader.int32() < 1) {
        throw new Error(`Unsupported resource manager header: ${filename}`);
    }
    reader.seek(reader.int32(), true);
    if (reader.int32() !== 2) {
        throw new Error(`Unsupported .resources version: ${filename}`);
    }
    const resourceCount = reader.int32();
    const typeCount = reader.int32();
    for (let index = 0; index < typeCount; index++) {
        reader.string();
    }
    while (reader.offset % 8) {
        reader.bytes(1);
    }
    reader.seek(resourceCount * 4, true);
    const namePositions = Array.from({length: resourceCount}, () => reader.int32());
    const dataSectionOffset = reader.int32();
    const nameSectionOffset = reader.offset;
    const entries = {};
    for (const namePosition of namePositions) {
        reader.seek(nameSectionOffset + namePosition);
        const name = reader.string('utf16le');
        const valuePosition = dataSectionOffset + reader.int32();
        reader.seek(valuePosition);
        const typeCode = reader.sevenBitInt();
        if (typeCode === 0) {
            entries[name] = '';
        }
        else if (typeCode === 1) {
            entries[name] = reader.string();
        }
    }
    return entries;
}

function decodeEntities(value) {
    const named = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
    return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
        if (entity[0] !== '#') {
            return named[entity.toLowerCase()];
        }
        const hexadecimal = entity[1].toLowerCase() === 'x';
        return String.fromCodePoint(parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10));
    });
}

function stripMnemonics(value) {
    return decodeEntities(value).replace(/&&/g, '\0').replace(/&(?=.)/g, '').replace(/\0/g, '&');
}

function nestedStrings(entries) {
    const result = {};
    for (const key of Object.keys(entries).sort((left, right) => left.localeCompare(right))) {
        const parts = key.split('.').filter(Boolean).map(part => part[0].toLowerCase() + part.slice(1));
        if (!parts.length) {
            continue;
        }
        let current = result;
        for (const part of parts.slice(0, -1)) {
            if (typeof current[part] === 'string') {
                current[part] = {text: current[part]};
            }
            else if (!current[part] || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        const leaf = parts.at(-1);
        const value = stripMnemonics(entries[key]);
        current[leaf] = typeof current[leaf] === 'string'
            ? {text: current[leaf], value}
            : value;
    }
    return result;
}

function walk(directory) {
    const result = [];
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            result.push(...walk(filename));
        }
        else if (entry.isFile()) {
            result.push(filename);
        }
    }
    return result;
}

function canonicalLocale(locale) {
    if (!locale) {
        return 'en';
    }
    return locale.replaceAll('_', '-').split('-').map((part, index) => {
        if (index === 0) {
            return part.toLowerCase();
        }
        return part.length === 2 || part.length === 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1);
    }).join('-');
}

function findPngs(buffer) {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const images = new Map();
    let start = 0;
    while ((start = buffer.indexOf(signature, start)) !== -1) {
        let cursor = start + signature.length;
        let complete = false;
        while (cursor + 12 <= buffer.length) {
            const length = buffer.readUInt32BE(cursor);
            if (length > 50_000_000 || cursor + length + 12 > buffer.length) {
                break;
            }
            const type = buffer.toString('ascii', cursor + 4, cursor + 8);
            cursor += length + 12;
            if (type === 'IEND') {
                complete = true;
                break;
            }
        }
        if (complete) {
            const image = buffer.subarray(start, cursor);
            images.set(crypto.createHash('sha256').update(image).digest('hex'), image);
        }
        start += signature.length;
    }
    return images;
}

function writeJson(filename, value) {
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, JSON.stringify(value, null, 4) + '\n');
}

function extractLargestPngFromIco(buffer, filename) {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) {
        throw new Error(`Invalid ICO file: ${filename}`);
    }
    const imageCount = buffer.readUInt16LE(4);
    if (buffer.length < 6 + imageCount * 16) {
        throw new Error(`Truncated ICO directory: ${filename}`);
    }

    let largest = null;
    for (let index = 0; index < imageCount; index++) {
        const entry = 6 + index * 16;
        const width = buffer[entry] || 256;
        const height = buffer[entry + 1] || 256;
        const length = buffer.readUInt32LE(entry + 8);
        const offset = buffer.readUInt32LE(entry + 12);
        if (offset + length > buffer.length) {
            throw new Error(`Invalid ICO image offset: ${filename}`);
        }
        const image = buffer.subarray(offset, offset + length);
        if (!image.subarray(0, pngSignature.length).equals(pngSignature)) {
            continue;
        }
        if (!largest || width * height > largest.area) {
            largest = {area: width * height, image};
        }
    }
    if (!largest) {
        throw new Error(`ICO file does not contain an embedded PNG: ${filename}`);
    }
    return largest.image;
}

function installAssets({source, output, manifestPath}) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const sourceFiles = walk(source);
    const resourcesDll = sourceFiles.find(file => path.basename(file).toLowerCase() === 'paintdotnet.resources.dll');
    if (!resourcesDll) {
        throw new Error('PaintDotNet.Resources.dll was not found in the official archive');
    }
    const iconFile = sourceFiles.find(file => path.basename(file).toLowerCase() === 'paintdotnet.ico');
    if (!iconFile) {
        throw new Error('paintdotnet.ico was not found in the official archive');
    }

    fs.mkdirSync(output, {recursive: true});
    const discovered = findPngs(fs.readFileSync(resourcesDll));
    const missing = [];
    for (const [hash, destinations] of Object.entries(manifest.files)) {
        const image = discovered.get(hash);
        if (!image) {
            missing.push(...destinations);
            continue;
        }
        for (const destination of destinations) {
            const filename = path.join(output, destination);
            fs.mkdirSync(path.dirname(filename), {recursive: true});
            fs.writeFileSync(filename, image);
        }
    }
    if (missing.length) {
        throw new Error(`The official archive did not contain ${missing.length} expected assets`);
    }

    const resourcePattern = /^PaintDotNet\.Strings\.3(?:\.([A-Za-z0-9-]+))?\.resources$/i;
    const locales = [];
    for (const filename of sourceFiles) {
        const match = resourcePattern.exec(path.basename(filename));
        if (!match) {
            continue;
        }
        const locale = canonicalLocale(match[1]);
        writeJson(path.join(output, 'lang', `${locale}.json`), nestedStrings(readStringResources(filename)));
        locales.push(locale);
    }
    locales.sort((left, right) => left.localeCompare(right));
    writeJson(path.join(output, 'lang', 'languages.json'), {locales});
    const icon = fs.readFileSync(iconFile);
    const pngIcon = extractLargestPngFromIco(icon, iconFile);
    const hash = value => crypto.createHash('sha256').update(value).digest('hex');
    if (hash(icon) !== manifest.icons.ico || hash(pngIcon) !== manifest.icons.png) {
        throw new Error('The official archive contains unexpected icon data');
    }
    fs.writeFileSync(path.join(output, 'icon.ico'), icon);
    fs.writeFileSync(path.join(output, 'icon.png'), pngIcon);
    writeJson(path.join(output, '.paintdotjs-assets.json'), {
        paintDotNetVersion: manifest.paintDotNetVersion,
        installedAt: new Date().toISOString()
    });
    return {assetCount: Object.values(manifest.files).flat().length, languageCount: locales.length};
}

function parseArguments(argv) {
    const values = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index];
        if (!key.startsWith('--') || argv[index + 1] === undefined) {
            throw new Error(`Invalid argument: ${key}`);
        }
        values[key.slice(2)] = path.resolve(argv[index + 1]);
    }
    for (const required of ['source', 'output', 'manifest']) {
        if (!values[required]) {
            throw new Error(`Missing --${required}`);
        }
    }
    return values;
}

if (require.main === module) {
    try {
        const values = parseArguments(process.argv.slice(2));
        const result = installAssets({
            source: values.source,
            output: values.output,
            manifestPath: values.manifest
        });
        console.log(`Installed ${result.assetCount} assets and ${result.languageCount} languages.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = {extractLargestPngFromIco, installAssets, readStringResources};
