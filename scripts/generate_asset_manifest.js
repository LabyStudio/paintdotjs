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
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {extractLargestPngFromIco} = require('./install_desktop_assets');

function walk(directory) {
    const result = [];
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) result.push(...walk(filename));
        else if (entry.isFile()) result.push(filename);
    }
    return result;
}

function findFile(source, basename) {
    const target = basename.toLowerCase();
    const filename = walk(source).find(file => path.basename(file).toLowerCase() === target);
    if (!filename) throw new Error(`${basename} was not found in the official archive`);
    return filename;
}

function sanitizeAssetName(resourceName) {
    const parts = resourceName.split('.');
    const useful = parts.length > 4 ? parts.slice(2, -2) : parts.slice(0, -1);
    return useful.join('_')
        .replace(/(?<!^)(?=[A-Z])/g, '_')
        .toLowerCase()
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function extractNamedResources(resourcesDll, destination) {
    fs.mkdirSync(destination, {recursive: true});
    const result = spawnSync('monodis', ['--mresources', resourcesDll], {
        cwd: destination,
        encoding: 'utf8'
    });
    if (result.error?.code === 'ENOENT') {
        throw new Error('Updating Paint.NET assets requires monodis (the mono-utils package)');
    }
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim() || 'monodis could not read Paint.NET resources');
}

function generateAssetManifest({source, output, version}) {
    const resourcesDll = findFile(source, 'PaintDotNet.Resources.dll');
    const iconFile = findFile(source, 'paintdotnet.ico');
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'paintdotjs-resource-map-'));
    try {
        extractNamedResources(resourcesDll, temporary);
        const selected = new Map();
        for (const filename of walk(temporary)) {
            const resourceName = path.basename(filename);
            if (!resourceName.toLowerCase().endsWith('.png')) continue;
            const parts = resourceName.split('.');
            const category = parts.length > 1 ? parts[1].toLowerCase() : 'images';
            if (!['icons', 'images', 'cursors'].includes(category)) continue;
            const name = sanitizeAssetName(resourceName);
            const size = Number(/(\d+)\.png$/i.exec(resourceName)?.[1] || 0);
            const relativePath = `${category}/${name}.png`;
            const previous = selected.get(relativePath);
            if (!previous || size > previous.size) selected.set(relativePath, {filename, size});
        }
        if (!selected.size) throw new Error('No named PNG resources were found in PaintDotNet.Resources.dll');

        const files = {};
        for (const [relativePath, resource] of [...selected].sort(([left], [right]) => left.localeCompare(right))) {
            const hash = crypto.createHash('sha256').update(fs.readFileSync(resource.filename)).digest('hex');
            (files[hash] ||= []).push(relativePath);
        }
        const ico = fs.readFileSync(iconFile);
        const png = extractLargestPngFromIco(ico, iconFile);
        const hash = value => crypto.createHash('sha256').update(value).digest('hex');
        const manifest = {
            paintDotNetVersion: version,
            icons: {png: hash(png), ico: hash(ico)},
            files
        };
        fs.mkdirSync(path.dirname(output), {recursive: true});
        fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
        return Object.values(files).flat().length;
    } finally {
        fs.rmSync(temporary, {recursive: true, force: true});
    }
}

if (require.main === module) {
    try {
        const sourceIndex = process.argv.indexOf('--source');
        const outputIndex = process.argv.indexOf('--output');
        const versionIndex = process.argv.indexOf('--version');
        if (sourceIndex < 0 || outputIndex < 0 || versionIndex < 0) {
            throw new Error('Usage: generate_asset_manifest.js --source DIR --output FILE --version VERSION');
        }
        const count = generateAssetManifest({
            source: path.resolve(process.argv[sourceIndex + 1]),
            output: path.resolve(process.argv[outputIndex + 1]),
            version: process.argv[versionIndex + 1]
        });
        console.log(`Mapped ${count} assets by managed resource name.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = {generateAssetManifest};
