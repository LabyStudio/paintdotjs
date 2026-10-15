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

class SettingsUpdatesEntry extends SettingsEntry {

    render() {
        this.addHeading("Updates");
        this.addCheckbox("updates.automatic", "Automatically check for updates", {
            disabled: true,
            note: isApp ? "Desktop releases check automatically shortly after startup." :
                "The installed web app checks automatically while it is open."
        });
        this.addCheckbox("updates.prerelease", "Also check for pre-release versions", {
            disabled: true,
            note: "Pre-release update channels are not enabled."
        });
        let checkButton = null;
        checkButton = this.addButton("Check now", () => this.checkForUpdates(checkButton));
        if (!isApp) {
            this.addNote("Clears the paint.js offline cache and reloads the latest web version.");
        }
    }

    async checkForUpdates(button) {
        if (isApp) {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Checking...";
            this.setStatus("Checking GitHub Releases for a newer desktop version...");
            try {
                const result = await window.desktopUpdater.check();
                if (!result.supported) {
                    if (!result.managed) {
                        this.setStatus("Update checks are available in packaged desktop releases.");
                    } else {
                        this.setStatus(result.updateAvailable
                            ? `paint.js ${PdjInfo.formatVersion(result.version)} is available from GitHub Releases.`
                            : "You are using the latest version. Updates for this installation are installed manually.");
                    }
                } else if (result.version && result.version !== window.PDJVERSION) {
                    this.setStatus(`Downloading paint.js ${PdjInfo.formatVersion(result.version)} in the background...`);
                } else {
                    this.setStatus("You are using the latest version of paint.js.");
                }
            } catch (error) {
                console.error("Could not check for desktop updates", error);
                this.setStatus("The update check failed. Please try again later.");
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
            return;
        }

        if (window.app?.hasUnsavedDocuments?.()) {
            const choice = await TaskDialog.show({
                title: "Update paint.js",
                icon: "assets/icons/settings_updates_24.png",
                message: "Reloading will close the current documents. Save your changes before continuing.",
                cancelValue: "cancel",
                choices: [
                    {
                        value: "reload",
                        title: "Update and reload",
                        description: "Continue after you have saved everything.",
                        icon: "assets/icons/settings_updates_24.png"
                    },
                    {
                        value: "cancel",
                        title: "Cancel",
                        description: "Return to paint.js without clearing anything.",
                        icon: "assets/icons/menu_edit_undo_icon.png"
                    }
                ]
            });
            if (choice !== "reload") {
                return;
            }
        }

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Checking...";
        this.setStatus("Clearing the offline cache and checking for updates...");

        try {
            const appScope = new URL("./", document.baseURI).href;
            if ("serviceWorker" in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                const appRegistrations = registrations.filter(registration => registration.scope === appScope);
                await Promise.all(appRegistrations.map(registration => registration.unregister()));
            }

            if ("caches" in window) {
                const cacheNames = await caches.keys();
                const appCacheNames = cacheNames.filter(name => name.toLowerCase().includes("paintdotjs"));
                await Promise.all(appCacheNames.map(name => caches.delete(name)));
            }

            const reloadUrl = new URL(window.location.href);
            reloadUrl.searchParams.set("v", Date.now().toString());
            window.location.replace(reloadUrl.href);
        } catch (error) {
            console.error("Could not refresh paint.js", error);
            button.disabled = false;
            button.textContent = originalText;
            this.setStatus("Could not clear the offline cache. Please try again.");
        }
    }
}
