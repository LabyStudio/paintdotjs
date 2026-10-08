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

const {app, autoUpdater: nativeAutoUpdater, BrowserWindow, Menu, ipcMain, net, protocol, screen} = require('electron');
const {setupTitlebar} = require('custom-electron-titlebar/main');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {ensureDesktopAssets} = require('./asset-manager');
const updater = require('./updater');

protocol.registerSchemesAsPrivileged([{
    scheme: 'paintjs',
    privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}
}]);
setupTitlebar();

let mainWindow = null;
let activeAssets = null;
const pendingFiles = [];
let closeDialogReady = false;
let closeDialogPending = false;
let quittingForUpdate = false;
let saveWindowStateTimer = null;

const defaultWindowBounds = {width: 1080, height: 720};
const minimumWindowBounds = {width: 640, height: 480};

function windowStatePath() {
    return path.join(app.getPath('userData'), 'window-state.json');
}

function readWindowState() {
    try {
        const state = JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'));
        const bounds = state?.bounds;
        if (!bounds || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key]))) {
            return null;
        }
        if (bounds.width <= 0 || bounds.height <= 0) {
            return null;
        }
        return {
            bounds: Object.fromEntries(
                ['x', 'y', 'width', 'height'].map(key => [key, Math.round(bounds[key])])
            ),
            maximized: state.maximized === true
        };
    } catch (_) {
        return null;
    }
}

function intersectionArea(first, second) {
    const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
    const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
    return width * height;
}

function restoreWindowBounds(savedBounds) {
    if (!savedBounds) {
        return null;
    }

    const displays = screen.getAllDisplays();
    let display = screen.getPrimaryDisplay();
    let greatestIntersection = 0;
    for (const candidate of displays) {
        const intersection = intersectionArea(savedBounds, candidate.workArea);
        if (intersection > greatestIntersection) {
            display = candidate;
            greatestIntersection = intersection;
        }
    }

    const workArea = display.workArea;
    const width = Math.min(Math.max(savedBounds.width, minimumWindowBounds.width), workArea.width);
    const height = Math.min(Math.max(savedBounds.height, minimumWindowBounds.height), workArea.height);
    return {
        x: Math.min(Math.max(savedBounds.x, workArea.x), workArea.x + workArea.width - width),
        y: Math.min(Math.max(savedBounds.y, workArea.y), workArea.y + workArea.height - height),
        width,
        height
    };
}

function writeWindowState(window) {
    if (!window || window.isDestroyed()) {
        return;
    }
    try {
        fs.mkdirSync(path.dirname(windowStatePath()), {recursive: true});
        fs.writeFileSync(windowStatePath(), JSON.stringify({
            bounds: window.getNormalBounds(),
            maximized: window.isMaximized()
        }));
    } catch (error) {
        console.warn('Could not save window state:', error);
    }
}

function scheduleWindowStateSave(window) {
    clearTimeout(saveWindowStateTimer);
    saveWindowStateTimer = setTimeout(() => {
        saveWindowStateTimer = null;
        writeWindowState(window);
    }, 250);
}

// electron-updater must be allowed to close every window synchronously before
// its installer replaces the app. The regular close guard is asynchronous and
// cancels that quit sequence on macOS, leaving the old app running without a
// window and preventing Squirrel.Mac from installing the downloaded update.
nativeAutoUpdater.on('before-quit-for-update', () => {
    quittingForUpdate = true;
    closeDialogPending = false;
});

// Electron/AppImage command lines may contain both the original .AppImage and
// its executable inside /tmp/.mount_*. Only paths with document extensions we
// actually support should ever reach the renderer as files to open.
const supportedDocumentExtensions = new Set([
    '.pdn', '.png', '.jpg', '.jpeg', '.jpe', '.webp', '.gif', '.bmp',
    '.tif', '.tiff', '.jxl', '.avif', '.heic', '.heif', '.dds', '.tga',
    '.jxr', '.wdp', '.wmp', '.json'
]);

function commandLineFiles(argv) {
    return argv
        .filter(value => typeof value === 'string' && !value.startsWith('-'))
        .map(value => path.resolve(value))
        .filter(value => supportedDocumentExtensions.has(path.extname(value).toLowerCase()))
        .filter(value => {
            try {
                return fs.statSync(value).isFile();
            } catch (_) {
                return false;
            }
        });
}

function queueFiles(files) {
    for (const filename of files) {
        const resolved = path.resolve(filename);
        if (!pendingFiles.includes(resolved)) {
            pendingFiles.push(resolved);
        }
    }
    deliverPendingFiles();
}

function deliverPendingFiles() {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) {
        return;
    }
    if (pendingFiles.length) {
        mainWindow.webContents.send('desktop:open-files', pendingFiles.splice(0));
    }
}

app.on('open-file', (event, filename) => {
    event.preventDefault();
    queueFiles([filename]);
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', (_event, argv) => {
        queueFiles(commandLineFiles(argv));
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function resolveAppRequest(requestUrl) {
    const url = new URL(requestUrl);
    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!relative) {
        relative = 'index.html';
    }
    const normalized = path.normalize(relative);
    if (path.isAbsolute(normalized) || normalized.startsWith('..')) {
        return null;
    }

    const candidates = [];
    if (normalized === 'assets' || normalized.startsWith(`assets${path.sep}`)) {
        const assetRelative = normalized.slice('assets'.length).replace(/^[/\\]+/, '');
        if (activeAssets) {
            candidates.push(path.join(activeAssets, assetRelative));
        }
        candidates.push(path.join(process.resourcesPath, 'assets', assetRelative));
        candidates.push(path.join(app.getAppPath(), 'assets', assetRelative));
    } else {
        candidates.push(path.join(app.getAppPath(), normalized));
    }
    return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

async function registerAppProtocol() {
    await protocol.handle('paintjs', request => {
        const filename = resolveAppRequest(request.url);
        if (!filename) {
            return new Response('Not found', {status: 404});
        }
        return net.fetch(pathToFileURL(filename).toString());
    });
}

function createWindow() {
    closeDialogReady = false;
    closeDialogPending = false;
    const savedWindowState = readWindowState();
    const restoredBounds = restoreWindowBounds(savedWindowState?.bounds);
    mainWindow = new BrowserWindow({
        icon: app.isPackaged
            ? path.join(process.resourcesPath, 'desktop', 'icon.png')
            : path.join(app.getAppPath(), 'desktop-resources', 'icon.png'),
        backgroundColor: '#21252b',
        show: false,
        frame: false,
        titleBarStyle: 'hidden',
        ...defaultWindowBounds,
        ...(restoredBounds || {}),
        minWidth: minimumWindowBounds.width,
        minHeight: minimumWindowBounds.height,
        webPreferences: {
            webgl: true,
            webSecurity: true,
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    Menu.setApplicationMenu(null);
    const startupQuery = pendingFiles.length ? '?skipWelcome=1' : '';
    void mainWindow.loadURL(`paintjs://app/index.html${startupQuery}`);
    mainWindow.once('ready-to-show', () => {
        if (savedWindowState?.maximized) {
            mainWindow.maximize();
        }
        mainWindow.show();
    });
    mainWindow.webContents.on('did-finish-load', () => setImmediate(deliverPendingFiles));
    mainWindow.on('move', () => scheduleWindowStateSave(mainWindow));
    mainWindow.on('resize', () => scheduleWindowStateSave(mainWindow));
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximize', true);
        scheduleWindowStateSave(mainWindow);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-maximize', false);
        scheduleWindowStateSave(mainWindow);
    });
    mainWindow.on('closed', () => {
        clearTimeout(saveWindowStateTimer);
        saveWindowStateTimer = null;
        mainWindow = null;
    });
    mainWindow.on('close', event => {
        writeWindowState(mainWindow);
        if (quittingForUpdate) {
            return;
        }
        if (!closeDialogReady) {
            return;
        }
        event.preventDefault();
        if (closeDialogPending) {
            return;
        }
        closeDialogPending = true;
        mainWindow.webContents.send('desktop:request-close');
    });

    mainWindow.webContents.on('before-input-event', (_event, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            mainWindow.webContents.isDevToolsOpened()
                ? mainWindow.webContents.closeDevTools()
                : mainWindow.webContents.openDevTools({mode: 'undocked'});
        }
    });

    updater.initializeUpdater(mainWindow);
}

ipcMain.on('resize-window', (_event, {width, height}) => {
    if (!mainWindow) {
        return;
    }
    const bounds = mainWindow.getBounds();
    mainWindow.setBounds({...bounds, width: Math.max(width, 100), height: Math.max(height, 100)});
});
ipcMain.on('desktop:close-dialog-ready', event => {
    if (mainWindow !== null && event.sender === mainWindow.webContents) {
        closeDialogReady = true;
    }
});
ipcMain.on('desktop:close-response', (event, shouldClose) => {
    if (mainWindow === null || event.sender !== mainWindow.webContents) {
        return;
    }
    closeDialogPending = false;
    if (shouldClose) {
        writeWindowState(mainWindow);
        mainWindow.destroy();
    }
});
ipcMain.handle('desktop:check-for-updates', () => updater.checkForUpdates());
ipcMain.on('desktop:install-update', () => updater.installUpdate());

async function prepareApplication() {
    while (!activeAssets) {
        try {
            activeAssets = await ensureDesktopAssets();
        } catch (error) {
            const result = await dialog.showMessageBox({
                type: 'error',
                title: 'paint.js setup failed',
                message: 'Required assets could not be installed.',
                detail: error.message,
                buttons: ['Retry', 'Quit'],
                defaultId: 0,
                cancelId: 1
            });
            if (result.response === 1) {
                return app.quit();
            }
        }
    }
    await registerAppProtocol();
    queueFiles(commandLineFiles(process.argv.slice(app.isPackaged ? 1 : 2)));
    createWindow();
}

if (gotSingleInstanceLock) {
    app.whenReady().then(prepareApplication);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0 && activeAssets) {
            createWindow();
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && activeAssets) {
        app.quit();
    }
});
