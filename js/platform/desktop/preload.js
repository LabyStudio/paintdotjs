const {CustomTitlebar, TitlebarColor} = require('custom-electron-titlebar')
const {app, BrowserWindow, Menu} = require('electron')

window.PDJVERSION = require('../../../package.json').version;

window.addEventListener('DOMContentLoaded', () => {
    new CustomTitlebar({
        backgroundColor: TitlebarColor.fromHex('#0D0D0D'),
        menuPosition: 'bottom'
    });
})