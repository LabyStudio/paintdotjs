// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron')
const {setupTitlebar} = require("custom-electron-titlebar/main");
const path = require('path')

setupTitlebar();

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        icon: './assets/icon.png',
        backgroundColor: '#21252b',
        show: false,
        frame: false, // Use to Linux
        titleBarStyle: 'hidden',
        titleBarOverlay: true,
        width: 1080,
        height: 720,
        minWidth: 640,
        minHeight: 480,
        webPreferences: {
            webgl: true,
            webSecurity: true,
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    Menu.getApplicationMenu().items = [];

    mainWindow.loadFile('index.html')
    mainWindow.show()

    mainWindow.webContents.on('before-input-event', (_, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            mainWindow.webContents.isDevToolsOpened()
                ? mainWindow.webContents.closeDevTools()
                : mainWindow.webContents.openDevTools({mode: 'undocked'});
        }
    });

    // Chromium's beforeunload prompt protects dirty documents in a browser,
    // but Electron suppresses that prompt and emits will-prevent-unload. Show
    // an explicit desktop confirmation and allow the close only when chosen.
    mainWindow.webContents.on('will-prevent-unload', event => {
        const choice = dialog.showMessageBoxSync(mainWindow, {
            type: 'warning',
            buttons: ['Close without saving', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            noLink: true,
            title: 'Unsaved Changes',
            message: 'There are unsaved changes.',
            detail: 'Do you want to close paint.js and discard them?'
        });
        if (choice === 0) event.preventDefault();
    });

    ipcMain.on('resize-window', (event, { width, height }) => {
        if (mainWindow) {
            mainWindow.setBounds({
                x: mainWindow.getBounds().x,
                y: mainWindow.getBounds().y,
                width: Math.max(width, 100), // Minimum width
                height: Math.max(height, 100), // Minimum height
            });
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})
