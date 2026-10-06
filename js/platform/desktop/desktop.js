const {CustomTitlebar, TitlebarColor} = require('custom-electron-titlebar')
const {ipcRenderer, clipboard, shell, webUtils} = require('electron');

window.desktopFileActions = {
    copyText: text => clipboard.writeText(text),
    getPathForFile: file => webUtils.getPathForFile(file),
    showItemInFolder: filePath => shell.showItemInFolder(filePath)
};

const desktopTitlebar = new CustomTitlebar({
    backgroundColor: TitlebarColor.fromHex('#0D0D0D'),
    menuPosition: 'bottom'
});

/**
 * The Electron title bar lives outside paint.js' regular layout, so CSS
 * variables do not style it automatically. Mirror the resolved application
 * theme whenever Settings changes the root color-scheme attribute.
 */
const updateDesktopTitlebarTheme = () => {
    const styles = getComputedStyle(document.documentElement);
    const backgroundColor = styles.getPropertyValue('--color-title-bar').trim();

    if (backgroundColor !== '') {
        desktopTitlebar.updateBackground(TitlebarColor.fromHex(backgroundColor));
    }
};

const titlebarThemeObserver = new MutationObserver(updateDesktopTitlebarTheme);
titlebarThemeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-color-scheme']
});
updateDesktopTitlebarTheme();

document.documentElement.style.setProperty('--window-top', windowTop() + 'px');


const resizeHandle = document.getElementById('windowResize');
resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();

    const startX = e.screenX;
    const startY = e.screenY;

    // Save the current window size (or initial size)
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    // Mouse move event to resize the window
    const resizeMouseMove = (moveEvent) => {
        const newWidth = initialWidth + (moveEvent.screenX - startX);
        const newHeight = initialHeight + (moveEvent.screenY - startY);

        // Send new size to the main process
        ipcRenderer.send('resize-window', { width: newWidth, height: newHeight });
    };

    // End resize when mouse is released
    const resizeMouseUp = () => {
        window.removeEventListener('mousemove', resizeMouseMove);
        window.removeEventListener('mouseup', resizeMouseUp);
    };

    // Add event listeners for mouse movement
    window.addEventListener('mousemove', resizeMouseMove);
    window.addEventListener('mouseup', resizeMouseUp);
});
