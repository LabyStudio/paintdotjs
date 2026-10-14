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

const {app} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function validAssetDirectory(directory) {
    return fs.existsSync(path.join(directory, 'asset-pack.json'))
        && fs.existsSync(path.join(directory, 'lang', 'en.json'))
        && fs.existsSync(path.join(directory, 'icons', 'menu_file_open_icon.png'));
}

function findInstalledAssets() {
    const external = process.env.PAINTDOTJS_ASSETS_DIR;
    if (external && validAssetDirectory(external)) {
        return path.resolve(external);
    }
    const directory = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(app.getAppPath(), 'assets');
    return validAssetDirectory(directory) ? directory : null;
}

async function ensureDesktopAssets() {
    const assets = findInstalledAssets();
    if (assets === null) {
        throw new Error('The built-in paint.js asset pack is missing. Reinstall the application.');
    }
    return assets;
}

module.exports = {ensureDesktopAssets, findInstalledAssets};
