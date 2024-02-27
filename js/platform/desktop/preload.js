const {CustomTitlebar, TitlebarColor} = require('custom-electron-titlebar')

window.appVersion = require('../../../package.json').version;

window.addEventListener('DOMContentLoaded', () => {
    new CustomTitlebar({
        backgroundColor: TitlebarColor.fromHex('#0D0D0D'),
        menuPosition: 'bottom'
    });
})