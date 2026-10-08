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

const {CustomTitlebar, TitlebarColor} = require('custom-electron-titlebar')
const {ipcRenderer, clipboard, shell, webUtils} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const localFilePaths = new WeakMap();

window.desktopFileActions = {
    copyText: text => clipboard.writeText(text),
    getClipboardImageSize: () => {
        const image = clipboard.readImage();
        return image.isEmpty() ? null : image.getSize();
    },
    getPathForFile: file => localFilePaths.get(file) || webUtils.getPathForFile(file),
    writeFile: async (filePath, data) => {
        await fs.promises.writeFile(filePath, Buffer.from(data));
    },
    showItemInFolder: filePath => shell.showItemInFolder(filePath)
};

const waitForApplication = () => new Promise(resolve => {
    const poll = () => {
        if (window.app && typeof DocumentIO !== 'undefined') {
            resolve();
        }
        else {
            setTimeout(poll, 25);
        }
    };
    poll();
});

let closeDialogOpen = false;
ipcRenderer.on('desktop:request-close', async () => {
    if (closeDialogOpen) {
        return;
    }
    closeDialogOpen = true;
    let shouldClose = false;
    try {
        await waitForApplication();
        const dirtyWorkspaces = app.getDocumentWorkspaces().filter(workspace => workspace.isDirty());
        if (dirtyWorkspaces.length === 0) {
            shouldClose = true;
        } else {
            const choice = await DocumentIO.showUnsavedChangesDialog(dirtyWorkspaces);
            shouldClose = choice === 'discard'
                || (choice === 'save' && await DocumentIO.saveAll());
        }
    } catch (error) {
        console.error('Could not finish the close request', error);
    } finally {
        closeDialogOpen = false;
        ipcRenderer.send('desktop:close-response', shouldClose);
    }
});

void waitForApplication().then(() => ipcRenderer.send('desktop:close-dialog-ready'));

const openLocalFiles = async filenames => {
    await waitForApplication();
    const files = [];
    for (const filename of filenames) {
        try {
            const data = await fs.promises.readFile(filename);
            const file = new Blob([data]);
            Object.defineProperties(file, {
                name: {value: path.basename(filename)},
                lastModified: {value: (await fs.promises.stat(filename)).mtimeMs}
            });
            localFilePaths.set(file, filename);
            files.push(file);
        } catch (error) {
            console.error(`Could not read ${filename}`, error);
        }
    }
    if (files.length) {
        await DocumentIO.openFiles(files);
    }
};

ipcRenderer.on('desktop:open-files', (_event, filenames) => void openLocalFiles(filenames));

let updatePromptOpen = false;
const showDownloadedUpdate = async version => {
    if (updatePromptOpen) {
        return;
    }
    updatePromptOpen = true;
    try {
        await waitForApplication();
        const choice = await TaskDialog.show({
            title: 'paint.js update ready',
            icon: 'assets/icons/update_prompt_task_dialog_form_icon.png',
            message: `paint.js ${version} has been downloaded. Restart to install it?`,
            cancelValue: 'later',
            choices: [{
                value: 'restart',
                title: 'Save All and Restart',
                description: 'Save changed images, install the update, and reopen paint.js.',
                icon: 'assets/icons/update_prompt_task_dialog_install_now.png'
            }, {
                value: 'later',
                title: 'Install When I Exit',
                description: 'The update will be installed after paint.js closes.',
                icon: 'assets/icons/update_prompt_task_dialog_install_at_exit.png'
            }]
        });
        if (choice === 'restart' && (!app.hasUnsavedDocuments() || await DocumentIO.saveAll())) {
            ipcRenderer.send('desktop:install-update');
        }
    } finally {
        updatePromptOpen = false;
    }
};

window.desktopUpdater = {
    state: 'idle',
    detail: null,
    check: () => ipcRenderer.invoke('desktop:check-for-updates'),
    onStateChanged: null
};
ipcRenderer.on('desktop:update-state', (_event, update) => {
    window.desktopUpdater.state = update.state;
    window.desktopUpdater.detail = update.detail;
    window.desktopUpdater.onStateChanged?.(update);
    if (update.state === 'downloaded') {
        void showDownloadedUpdate(update.detail);
    }
});

const desktopTitlebar = new CustomTitlebar({
    backgroundColor: TitlebarColor.fromHex('#0D0D0D'),
    menuPosition: 'bottom'
});
window.updatePlatformTitle = title => desktopTitlebar.updateTitle(title);

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
