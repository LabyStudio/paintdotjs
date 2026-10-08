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


if (typeof isApp !== 'undefined' && !isApp && 'serviceWorker' in navigator) {
    const isLocalDevelopment = location.hostname === 'localhost'
        || location.hostname === '127.0.0.1'
        || location.hostname === '[::1]';

    async function configureServiceWorker() {
        try {
            if (isLocalDevelopment) {
                // A precaching worker is useful for the deployed PWA, but it
                // makes IDE/live-reload pages serve stale source files. Remove
                // any worker left behind by an older build on this local origin.
                const registrations = await navigator.serviceWorker.getRegistrations();
                const controlled = navigator.serviceWorker.controller !== null;

                await Promise.all(registrations.map((registration) => registration.unregister()));

                if (controlled && sessionStorage.getItem('paintdotjs-sw-cleared') !== '1') {
                    sessionStorage.setItem('paintdotjs-sw-cleared', '1');
                    location.reload();
                } else {
                    sessionStorage.removeItem('paintdotjs-sw-cleared');
                }

                return;
            }

            let isRefreshing = false;
            let updatePromptOpen = false;
            let updateAccepted = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (isRefreshing) {
                    return;
                }

                // A waiting worker only takes control while this page is open
                // after the user chooses Install Now.
                if (!updateAccepted) {
                    return;
                }
                isRefreshing = true;
                location.reload();
            });

            const registration = await navigator.serviceWorker.register('./service_worker.js', {
                updateViaCache: 'none'
            });

            const waitForFreeDialogSlot = () => new Promise(resolve => {
                if (!ModalDialogController.isActive()) {
                    resolve();
                    return;
                }

                const observer = new MutationObserver(() => {
                    if (!ModalDialogController.isActive()) {
                        observer.disconnect();
                        resolve();
                    }
                });
                observer.observe(document.body, {childList: true, subtree: true});
            });

            const getAvailableVersion = async () => {
                try {
                    const url = new URL('./assets/update.json', document.baseURI);
                    url.searchParams.set('v', Date.now().toString());
                    const response = await fetch(url, {cache: 'no-store'});
                    if (!response.ok) {
                        return null;
                    }
                    const metadata = await response.json();
                    return typeof metadata.version === 'string' ? metadata.version : null;
                } catch (_) {
                    return null;
                }
            };

            const createUpdatePreview = version => {
                const preview = document.createElement('div');
                preview.className = 'update-prompt-preview';
                {
                    // Artwork
                    const image = document.createElement('img');
                    image.src = 'assets/images/update_prompt_task_dialog_task_image.png';
                    image.alt = '';

                    // Version
                    const versionLabel = document.createElement('strong');
                    versionLabel.textContent = version === null
                        ? 'A newer version is ready'
                        : 'paint.js ' + version;

                    // Release link
                    const moreInfo = document.createElement('a');
                    moreInfo.href = 'https://github.com/LabyStudio/paintdotjs/releases';
                    moreInfo.target = '_blank';
                    moreInfo.rel = 'noopener';
                    moreInfo.textContent = 'More info';

                    preview.append(image, versionLabel, moreInfo);
                }
                return preview;
            };

            const confirmUnsavedUpdate = async () => {
                if (!window.app?.hasUnsavedDocuments?.()) {
                    return true;
                }

                const choice = await TaskDialog.show({
                    title: 'Save before updating',
                    icon: 'assets/icons/update_prompt_task_dialog_form_icon.png',
                    message: 'paint.js must reload to finish the update. Save your open work first?',
                    cancelValue: 'cancel',
                    choices: [{
                        value: 'save',
                        title: 'Save All and Update',
                        description: 'Save every open image, then install the update.',
                        icon: 'assets/icons/menu_file_save_all_icon.png'
                    }, {
                        value: 'discard',
                        title: 'Update Without Saving',
                        description: 'Reload now and discard unsaved changes.',
                        icon: 'assets/icons/update_prompt_task_dialog_install_now.png'
                    }, {
                        value: 'cancel',
                        title: 'Cancel',
                        description: 'Return to paint.js without installing now.',
                        icon: 'assets/icons/menu_edit_undo_icon.png'
                    }]
                });

                if (choice === 'save') {
                    return await DocumentIO.saveAll();
                }
                return choice === 'discard';
            };

            const showUpdatePrompt = async worker => {
                if (worker === null || updatePromptOpen) {
                    return;
                }
                updatePromptOpen = true;

                try {
                    await waitForFreeDialogSlot();
                    const version = await getAvailableVersion();
                    const result = await TaskDialog.show({
                        title: 'paint.js Updates',
                        className: 'update-prompt-dialog',
                        icon: 'assets/icons/update_prompt_task_dialog_form_icon.png',
                        preview: createUpdatePreview(version),
                        message: 'An update for paint.js is available. It is strongly recommended that you install it as soon as possible.',
                        cancelValue: 'later',
                        choices: [{
                            value: 'later',
                            title: 'Install When I Exit',
                            description: 'The update is ready and will be installed after all paint.js tabs are closed.',
                            icon: 'assets/icons/update_prompt_task_dialog_install_at_exit.png'
                        }, {
                            value: 'now',
                            title: 'Install Now',
                            description: 'Install the update and reload paint.js now.',
                            icon: 'assets/icons/update_prompt_task_dialog_install_now.png'
                        }]
                    });

                    if (result !== 'now') {
                        return;
                    }
                    if (!await confirmUnsavedUpdate()) {
                        return;
                    }

                    updateAccepted = true;
                    worker.postMessage({type: 'SKIP_WAITING'});
                } finally {
                    updatePromptOpen = false;
                }
            };

            const watchInstallingWorker = worker => {
                if (worker === null) {
                    return;
                }
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller !== null) {
                        void showUpdatePrompt(registration.waiting || worker);
                    }
                });
            };

            if (registration.waiting !== null && navigator.serviceWorker.controller !== null) {
                void showUpdatePrompt(registration.waiting);
            }
            registration.addEventListener('updatefound', () => {
                watchInstallingWorker(registration.installing);
            });
            watchInstallingWorker(registration.installing);

            let lastUpdateCheck = 0;
            const checkForUpdate = async () => {
                if (Date.now() - lastUpdateCheck < 5 * 60 * 1000) {
                    return;
                }
                lastUpdateCheck = Date.now();
                try {
                    await registration.update();
                } catch (error) {
                    console.log(error);
                }
            };

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    void checkForUpdate();
                }
            });
            setInterval(() => void checkForUpdate(), 60 * 60 * 1000);
            await checkForUpdate();
        } catch (err) {
            console.log(err);
        }
    }

    void configureServiceWorker();
}
