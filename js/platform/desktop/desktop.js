const {CustomTitlebar, TitlebarColor} = require('custom-electron-titlebar')
const { ipcRenderer } = require('electron');

new CustomTitlebar({
    backgroundColor: TitlebarColor.fromHex('#0D0D0D'),
    menuPosition: 'bottom'
});

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