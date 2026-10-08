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
const fsp = require('node:fs/promises');
const path = require('node:path');
const {downloadArchive, extractArchive} = require('./asset_archive');
const {generateAssetManifest} = require('./generate_asset_manifest');
const {installAssets} = require('./install_desktop_assets');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const manifestPath = path.join(root, 'desktop-resources', 'asset-manifest.json');
const manifest = require(manifestPath);
const assets = path.join(root, 'assets');
const markerPath = path.join(assets, '.paintdotjs-assets.json');
const version = packageJson.paintdotjs.paintDotNetVersion;
const expectedSha256 = packageJson.paintdotjs.paintDotNetSha256;
const url = `https://github.com/paintdotnet/release/releases/download/v${version}/paint.net.${version}.portable.x64.zip`;

function requiredFilesExist() {
    return [
        'icon.png',
        'icon.ico',
        'lang/en.json',
        'lang/languages.json',
        'icons/menu_file_new_icon.png',
        'images/pdn_banner_logo_dark.png'
    ].every(relative => fs.existsSync(path.join(assets, relative)));
}

function fileHasHash(filename, expected) {
    if (!fs.existsSync(filename)) {
        return false;
    }
    return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex') === expected;
}

function officialIconsAreCurrent() {
    return fileHasHash(path.join(assets, 'icon.png'), manifest.icons.png)
        && fileHasHash(path.join(assets, 'icon.ico'), manifest.icons.ico);
}

function markerIsCurrent() {
    try {
        return JSON.parse(fs.readFileSync(markerPath, 'utf8')).paintDotNetVersion === version;
    } catch (_) {
        return false;
    }
}

function generatedFilesExist() {
    if (!requiredFilesExist()) {
        return false;
    }
    if (!Object.values(manifest.files).flat().every(relativePath =>
        fs.existsSync(path.join(assets, relativePath)))) {
        return false;
    }
    try {
        const {locales} = JSON.parse(fs.readFileSync(path.join(assets, 'lang', 'languages.json'), 'utf8'));
        return Array.isArray(locales) && locales.length > 0
            && locales.every(locale => fs.existsSync(path.join(assets, 'lang', `${locale}.json`)));
    } catch (_) {
        return false;
    }
}

function mappedAssetsAreCurrent() {
    if (!requiredFilesExist() || !officialIconsAreCurrent() || manifest.paintDotNetVersion !== version) {
        return false;
    }
    for (const [hash, relativePaths] of Object.entries(manifest.files)) {
        for (const relativePath of relativePaths) {
            const filename = path.join(assets, relativePath);
            if (!fs.existsSync(filename)) {
                return false;
            }
            const actual = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
            if (actual !== hash) {
                return false;
            }
        }
    }
    return true;
}

async function ensureAssets() {
    const refreshManifest = process.argv.includes('--refresh-manifest');
    const versionUpdate = manifest.paintDotNetVersion !== version;
    await fsp.mkdir(assets, {recursive: true});
    if (!refreshManifest && !versionUpdate && markerIsCurrent() && generatedFilesExist() && officialIconsAreCurrent()) {
        return false;
    }
    if (!refreshManifest && mappedAssetsAreCurrent()) {
        await fsp.writeFile(markerPath, JSON.stringify({
            paintDotNetVersion: version,
            installedAt: new Date().toISOString()
        }, null, 4) + '\n');
        return false;
    }

    const cacheDirectory = path.join(root, '.tmp', 'paintdotnet');
    await fsp.mkdir(cacheDirectory, {recursive: true});
    const archive = path.join(cacheDirectory, `paint.net.${version}.portable.x64.zip`);
    const temporary = await fsp.mkdtemp(path.join(cacheDirectory, 'install-'));
    try {
        process.stdout.write(`Downloading Paint.NET ${version} assets...\n`);
        let lastPercent = -1;
        const archiveSha256 = await downloadArchive({
            url,
            destination: archive,
            expectedSha256: versionUpdate ? undefined : expectedSha256,
            onProgress: ({downloaded, total, cached}) => {
                if (cached) {
                    process.stdout.write('Using the cached archive.\n');
                } else if (total) {
                    const percent = Math.round(downloaded / total * 100);
                    if (percent !== lastPercent) {
                        process.stdout.write(`\rDownloaded ${percent}%`);
                    }
                    lastPercent = percent;
                }
            }
        });
        if (versionUpdate && packageJson.paintdotjs.paintDotNetSha256 !== archiveSha256) {
            packageJson.paintdotjs.paintDotNetSha256 = archiveSha256;
            await fsp.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
            process.stdout.write(`Recorded the Paint.NET ${version} archive checksum.\n`);
        }
        process.stdout.write('\nExtracting and installing assets...\n');
        const source = path.join(temporary, 'source');
        const generated = path.join(temporary, 'assets');
        await extractArchive(archive, source);
        if (refreshManifest || manifest.paintDotNetVersion !== version) {
            process.stdout.write(`Generating the Paint.NET ${version} asset manifest…\n`);
            const count = generateAssetManifest({source, output: manifestPath, version});
            process.stdout.write(`Mapped ${count} assets by managed resource name.\n`);
        }
        const result = installAssets({
            source,
            output: generated,
            manifestPath
        });
        await fsp.cp(generated, assets, {recursive: true, force: true});
        process.stdout.write(`Installed ${result.assetCount} assets and ${result.languageCount} languages.\n`);
        return true;
    } finally {
        await fsp.rm(temporary, {recursive: true, force: true});
    }
}

if (require.main === module) {
    ensureAssets().catch(error => {
        console.error(`Could not prepare Paint.NET assets: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {ensureAssets};
