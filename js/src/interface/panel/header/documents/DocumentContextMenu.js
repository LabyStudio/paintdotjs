class DocumentContextMenu {

    static show(x, y, workspace, previousWorkspace = null) {
        this.close();

        const filePath = workspace.getFilePath();
        const items = [
            this.createTitle(workspace.getFriendlyName()),
            new VerticalSeparator(),
            this.createEntry({
            text: i18n("menu.tab.copyPath.text"),
            icon: "menu_tab_copy_path_icon.png",
            enabled: filePath !== null,
            callback: () => this.copyPath(filePath)
            }),
            this.createEntry({
            text: i18n("menu.tab.openContainingFolder.text"),
            icon: "menu_file_open_icon.png",
            enabled: filePath !== null && window.desktopFileActions !== undefined,
            callback: () => window.desktopFileActions.showItemInFolder(filePath)
            }),
            new VerticalSeparator(),
            this.createEntry({
            text: i18n("menu.file.save.text"),
            icon: "menu_file_save_icon.png",
            shortcutActionId: "menu.file.save",
            callback: () => this.runForWorkspace(workspace, () => DocumentIO.saveActive(false))
            }),
            this.createEntry({
            text: i18n("menu.file.saveAs.text"),
            icon: "menu_file_save_as_icon.png",
            shortcutActionId: "menu.file.saveAs",
            callback: () => this.runForWorkspace(workspace, () => DocumentIO.saveActive(true))
            }),
            new VerticalSeparator(),
            this.createEntry({
            text: i18n("menu.file.close.text"),
            icon: "menu_file_close_icon.png",
            shortcutActionId: "menu.file.close",
            callback: async () => {
                if (!await DocumentIO.closeDocumentWorkspace(workspace)) return;
                if (previousWorkspace !== null
                    && window.app.getDocumentWorkspaces().includes(previousWorkspace)) {
                    window.app.setActiveDocumentWorkspace(previousWorkspace);
                }
            }
            })
        ];

        this.popup = new DropMenuPopup("document-context", {
            commandMenu: true,
            className: "document-context-menu",
            closeOwner: () => this.close(),
            onClose: () => this.finishClose()
        });
        const menu = this.popup.open(items);
        this.popup.positionAt(x, y);

        this.outsidePointerListener = event => {
            if (!menu.contains(event.target)) this.close();
        };
        this.escapeListener = event => {
            if (event.key === "Escape") this.close();
        };
        document.addEventListener("pointerdown", this.outsidePointerListener, true);
        document.addEventListener("keydown", this.escapeListener, true);
    }

    static createTitle(text) {
        const title = document.createElement("div");
        title.className = "document-context-title";
        title.textContent = text;
        return title;
    }

    static createEntry({text, icon, callback, enabled = true, shortcutActionId = null}) {
        const entry = new DropEntry(null, () => {
            Promise.resolve(callback()).catch(error => window.app.handleError(error));
        });
        entry.getText = () => text;
        entry.getIconPath = () => icon;
        const action = shortcutActionId === null ? null : ActionRegistry.get(shortcutActionId);
        entry.getShortcut = () => action === null ? null : action.getShortcutKey().toString();
        entry.setEnabled(enabled);
        return entry;
    }

    static async runForWorkspace(workspace, callback) {
        if (!window.app.getDocumentWorkspaces().includes(workspace)) return;
        if (window.app.getActiveDocumentWorkspace() !== workspace) {
            window.app.setActiveDocumentWorkspace(workspace);
        }
        await callback();
    }

    static async copyPath(filePath) {
        if (window.desktopFileActions !== undefined) {
            window.desktopFileActions.copyText(filePath);
            return;
        }
        await navigator.clipboard.writeText(filePath);
    }

    static close() {
        this.popup?.close();
        if (this.popup === null) this.finishClose();
    }

    static finishClose() {
        if (this.outsidePointerListener !== null) {
            document.removeEventListener("pointerdown", this.outsidePointerListener, true);
        }
        if (this.escapeListener !== null) {
            document.removeEventListener("keydown", this.escapeListener, true);
        }
        this.popup = null;
        this.outsidePointerListener = null;
        this.escapeListener = null;
    }
}

DocumentContextMenu.popup = null;
DocumentContextMenu.outsidePointerListener = null;
DocumentContextMenu.escapeListener = null;
