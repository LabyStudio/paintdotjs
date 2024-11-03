const fs = require('fs');
const {CustomTitlebar, TitlebarColor} = require('custom-electron-titlebar')
const {electronApp, BrowserWindow, Menu} = require('electron')

new CustomTitlebar({
    backgroundColor: TitlebarColor.fromHex('#0D0D0D'),
    menuPosition: 'bottom'
});

document.documentElement.style.setProperty('--window-top', windowTop() + 'px');