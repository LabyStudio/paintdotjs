// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu} = require('electron')
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

    mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})