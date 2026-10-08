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
const {autoUpdater} = require('electron-updater');

let window = null;
let initialized = false;

function send(state, detail = null) {
    if (window && !window.isDestroyed()) {
        window.webContents.send('desktop:update-state', {state, detail});
    }
}

function updatesSupported() {
    return app.isPackaged && process.env.PAINTDOTJS_PACKAGE_MANAGER !== 'aur';
}

function initializeUpdater(mainWindow) {
    window = mainWindow;
    if (initialized || !updatesSupported()) {
        if (!updatesSupported()) {
            send('managed');
        }
        return;
    }
    initialized = true;
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
    if (!updatesSupported()) {
        return {supported: false};
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
