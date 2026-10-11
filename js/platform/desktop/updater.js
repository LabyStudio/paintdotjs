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

const {app, net} = require('electron');
const {autoUpdater} = require('electron-updater');

const releaseApiUrl = 'https://api.github.com/repos/LabyStudio/paintdotjs/releases/latest';

let window = null;
let initialized = false;

function send(state, detail = null) {
    if (window && !window.isDestroyed()) {
        window.webContents.send('desktop:update-state', {state, detail});
    }
}

function isManagedInstall() {
    return process.env.PAINTDOTJS_MANAGED_INSTALL === '1';
}

function updatesSupported() {
    return app.isPackaged && !isManagedInstall();
}

function isNewerVersion(candidate, current) {
    const parts = version => version.split('-', 1)[0].split('.').map(part => Number.parseInt(part, 10) || 0);
    const candidateParts = parts(candidate);
    const currentParts = parts(current);
    for (let index = 0; index < Math.max(candidateParts.length, currentParts.length); index++) {
        const difference = (candidateParts[index] || 0) - (currentParts[index] || 0);
        if (difference !== 0) {
            return difference > 0;
        }
    }
    return false;
}

async function checkManagedUpdate() {
    const response = await net.fetch(releaseApiUrl, {
        headers: {'Accept': 'application/vnd.github+json'}
    });
    if (!response.ok) {
        throw new Error(`GitHub returned HTTP ${response.status}`);
    }
    const release = await response.json();
    const version = String(release.tag_name || '').replace(/^v/, '');
    if (!/^\d+(?:\.\d+)+([+-][0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error('GitHub returned an invalid release version');
    }
    const updateAvailable = isNewerVersion(version, app.getVersion());
    const url = `https://github.com/LabyStudio/paintdotjs/releases/tag/v${encodeURIComponent(version)}`;
    send(updateAvailable ? 'managed-available' : 'managed-current', {version, url});
    return {supported: false, managed: true, updateAvailable, version, url};
}

function initializeUpdater(mainWindow) {
    window = mainWindow;
    if (initialized) {
        return;
    }
    initialized = true;
    if (!app.isPackaged) {
        send('development');
        return;
    }
    if (isManagedInstall()) {
        send('managed');
        setTimeout(() => void checkManagedUpdate().catch(() => send('managed')), 10_000);
        return;
    }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => send('checking'));
    autoUpdater.on('update-available', info => send('available', info.version));
    autoUpdater.on('update-not-available', info => send('current', info.version));
    autoUpdater.on('download-progress', progress => send('downloading', Math.round(progress.percent)));
    autoUpdater.on('update-downloaded', info => send('downloaded', info.version));
    autoUpdater.on('error', error => send('error', error.message));
    setTimeout(() => void autoUpdater.checkForUpdates().catch(error => send('error', error.message)), 10_000);
}

async function checkForUpdates() {
    if (!app.isPackaged) {
        return {supported: false, managed: false};
    }
    if (isManagedInstall()) {
        return checkManagedUpdate();
    }
    const result = await autoUpdater.checkForUpdates();
    return {supported: true, version: result?.updateInfo?.version || null};
}

function installUpdate() {
    if (updatesSupported()) {
        autoUpdater.quitAndInstall(false, true);
    }
}

module.exports = {checkForUpdates, initializeUpdater, installUpdate, updatesSupported};
