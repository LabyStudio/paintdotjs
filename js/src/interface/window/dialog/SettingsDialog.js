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

class SettingsDialog {

    static open(section = "ui") {
        if (SettingsDialog.instance === null) {
            SettingsDialog.instance = new SettingsDialog();
        }
        SettingsDialog.instance.show(section);
    }

    constructor() {
        this.backdrop = null;
        this.dialog = null;
        this.page = null;
        this.status = null;
        this.dialogMover = null;
        this.activeSection = "ui";
        this.activeEntry = null;
        this.entries = new Map();
        this.search = null;
        this.shortcutList = null;
        this.fontList = null;
        this.fontAddButton = null;
        this.fontClearButton = null;
        this.fontDropZone = null;
        this.fontImportPanel = null;
        this.fontImportLabel = null;
        this.fontImportBar = null;
        this.fontImportState = null;
        this.fontImporting = false;
        this.fontRenderToken = 0;
        this.fontPreviewObserver = null;
        this.uiFontSelect = null;
        this.uiAssetPackSelect = null;
        this.assetPackList = null;
        this.assetPackImporting = false;
        this.assetPackPreviewUrls = [];
        this.shapeList = null;
        this.shapeAddButton = null;
        this.shapeClearButton = null;
        this.shapeDropZone = null;
        this.shapeIssuesButton = null;
        this.shapeImportResults = [];
        this.shapeImporting = false;
        this.pluginList = null;
        this.pluginImportResults = [];
        this.pluginImporting = false;
        this.changedListener = () => {
            if (this.backdrop !== null && this.activeSection === "keyboard") {
                this.getEntry("keyboard").renderShortcutRows();
            }
        };
        this.fontsChangedListener = () => {
            if (this.backdrop !== null && this.activeSection === "fonts") {
                this.getEntry("fonts").renderFontRows();
            } else if (this.backdrop !== null && this.activeSection === "ui") {
                this.getEntry("ui").updateUiFontSelect();
            }
        };
        window.addEventListener("paintdotjs:fonts-changed", this.fontsChangedListener);
        this.assetPacksChangedListener = () => {
            if (this.backdrop !== null && this.activeSection === "assets") {
                this.getEntry("assets").renderAssetPackRows();
            } else if (this.backdrop !== null && this.activeSection === "ui") {
                this.getEntry("ui").updateUiAssetPackSelect();
            }
        };
        window.addEventListener("paintdotjs:asset-packs-changed", this.assetPacksChangedListener);
        window.addEventListener("paintdotjs:asset-pack-changed", this.assetPacksChangedListener);
        this.shapesChangedListener = () => {
            if (this.backdrop !== null && this.activeSection === "shapes") {
                this.getEntry("shapes").renderShapeRows();
            }
        };
        window.addEventListener("paintdotjs:shapes-changed", this.shapesChangedListener);
        this.pluginsChangedListener = event => {
            if (this.backdrop !== null && this.activeSection === "plugins") {
                this.getEntry("plugins").renderPluginRows(event.detail?.addedId || null);
            }
        };
        window.addEventListener("paintdotjs:plugins-changed", this.pluginsChangedListener);
    }

    show(section) {
        if (this.backdrop !== null) {
            this.selectSection(section);
            return;
        }

        this.backdrop = document.createElement("div");
        this.backdrop.className = "app-dialog-backdrop settings-dialog-backdrop";
        if (isApp) {
            this.backdrop.classList.add("dialog-backdrop-app");
        }

        this.dialog = document.createElement("section");
        this.dialog.className = "app-dialog settings-dialog";
        this.dialog.setAttribute("role", "dialog");
        this.dialog.setAttribute("aria-modal", "true");
        this.dialog.setAttribute("aria-labelledby", "settings-dialog-title");
        this.dialog.onkeydown = event => {
            if (event.key === "Escape" && !event.target.classList.contains("shortcut-capture")) {
                this.close();
            }
        };

        {
            // Title bar
            const titleBar = this.createTitleBar();

            // Content
            const content = document.createElement("div");
            content.className = "settings-dialog-content";
            content.append(this.createNavigation(), this.createPageHost());

            // Footer
            const footer = document.createElement("footer");
            footer.className = "app-dialog-footer settings-dialog-footer";
            {
                this.status = document.createElement("span");

                const close = document.createElement("button");
                close.type = "button";
                close.textContent = "Close";
                close.onclick = () => this.close();
                footer.append(this.status, close);

                this.dialog.append(titleBar, content, footer);
                this.backdrop.appendChild(this.dialog);
                document.body.appendChild(this.backdrop);
                this.dialogMover = new DialogMover(this.dialog, titleBar, this.backdrop);
                ActionRegistry.addChangedListener(this.changedListener);
                this.selectSection(section);
                close.focus();
            }
        }
    }

    createTitleBar() {
        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar settings-dialog-title";
        {
            // Title
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            {
                const icon = document.createElement("img");
                icon.src = "assets/icons/menu_utilities_settings_icon.png";
                icon.alt = "";

                const title = document.createElement("strong");
                title.id = "settings-dialog-title";
                title.textContent = "Settings";
                titleGroup.append(icon, title);
            }

            // Close button
            const close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            close.title = "Close";
            close.onclick = () => this.close();
            titleBar.append(titleGroup, close);
        }
        return titleBar;
    }

    createNavigation() {
        const navigation = document.createElement("nav");
        navigation.className = "settings-navigation";
        {
            for (const group of SettingsEntryRegistry.groups) {
                const groupElement = document.createElement("div");
                groupElement.className = "settings-navigation-group";
                groupElement.dataset.group = group.id;
                {
                    if (group.label !== null) {
                        const title = document.createElement("div");
                        title.className = "settings-navigation-group-title";
                        title.textContent = group.label;
                        groupElement.appendChild(title);
                    }

                    for (const entry of group.entries) {
                        const button = document.createElement("button");
                        button.type = "button";
                        button.dataset.section = entry.id;
                        {
                            const icon = document.createElement("img");
                            icon.src = "assets/icons/" + entry.icon;
                            icon.alt = "";

                            const text = document.createElement("span");
                            text.textContent = entry.label;
                            button.append(icon, text);
                        }
                        button.onclick = () => this.selectSection(entry.id);
                        groupElement.appendChild(button);
                    }
                }
                navigation.appendChild(groupElement);
            }
        }
        return navigation;
    }

    createPageHost() {
        this.page = document.createElement("main");
        this.page.className = "settings-page";
        return this.page;
    }

    selectSection(section) {
        if (this.page === null) {
            return;
        }
        const definition = SettingsEntryRegistry.find(section);
        this.activeEntry?.deactivate();
        this.activeSection = definition.id;
        for (const button of this.dialog.querySelectorAll(".settings-navigation button")) {
            button.classList.toggle("active", button.dataset.section === definition.id);
        }

        this.search = null;
        this.shortcutList = null;
        this.fontList = null;
        this.assetPackList = null;
        this.shapeList = null;
        this.pluginList = null;
        this.uiFontSelect = null;
        this.uiAssetPackSelect = null;
        this.page.className = "settings-page settings-page-" + definition.id;
        this.page.innerHTML = "";
        this.activeEntry = this.getEntry(definition.id);
        this.activeEntry.render();
    }

    getEntry(section) {
        const definition = SettingsEntryRegistry.find(section);
        if (!this.entries.has(definition.id)) {
            this.entries.set(definition.id, SettingsEntryRegistry.create(this, definition.id));
        }
        return this.entries.get(definition.id);
    }

    importPlugin(file) {
        return this.getEntry("plugins").importPlugin(file);
    }

    importPluginFiles(files) {
        return this.getEntry("plugins").importPluginFiles(files);
    }

    importAssetPack(file) {
        return this.getEntry("assets").importAssetPack(file);
    }

    importShapes(files) {
        return this.getEntry("shapes").importShapes(files);
    }

    importFonts(files) {
        return this.getEntry("fonts").importFonts(files);
    }

    addHeading(text, description = "") {
        const heading = document.createElement("h2");
        heading.textContent = text;
        this.page.appendChild(heading);
        if (description) {
            const paragraph = document.createElement("p");
            paragraph.textContent = description;
            this.page.appendChild(paragraph);
        }
    }

    addCheckbox(path, label, options = {}) {
        const wrapper = document.createElement("label");
        wrapper.className = "settings-checkbox";
        if (options.disabled) {
            wrapper.classList.add("disabled");
            wrapper.title = options.tooltip || "Not implemented yet";
        }
        let input = null;
        {
            const text = document.createElement("span");
            text.textContent = label;

            input = document.createElement("input");
            input.type = "checkbox";
            input.checked = AppSettingsStore.get(path, false);
            input.disabled = Boolean(options.disabled);
            input.onchange = () => AppSettingsStore.set(path, input.checked);
            wrapper.append(input, text);
        }
        this.page.appendChild(wrapper);
        if (options.note) {
            this.addNote(options.note);
        }
        return input;
    }

    addSelect(path, label, choices, options = {}) {
        const row = document.createElement("label");
        row.className = "settings-field-row";
        if (options.disabled) {
            row.classList.add("disabled");
            row.title = options.tooltip || "Not implemented yet";
        }
        let select = null;
        {
            const text = document.createElement("span");
            text.textContent = label;

            select = document.createElement("select");
            select.disabled = Boolean(options.disabled);
            for (const [value, name] of choices) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = name;
                select.appendChild(option);
            }
            const fallback = choices.length > 0 ? choices[0][0] : "";
            select.value = options.value ?? (path === null
                ? fallback : AppSettingsStore.get(path, fallback));
            if (typeof options.onChange === "function") {
                select.onchange = () => options.onChange(select.value, select);
            } else if (path !== null) {
                select.onchange = () => AppSettingsStore.set(path, select.value);
            }
            row.append(text, select);
        }
        this.page.appendChild(row);
        if (options.note) {
            this.addNote(options.note);
        }
        return select;
    }

    addNote(text) {
        const note = document.createElement("p");
        note.className = "settings-note";
        note.textContent = text;
        this.page.appendChild(note);
        return note;
    }

    addSectionHeading(text) {
        const heading = document.createElement("h3");
        heading.className = "settings-section-heading";
        heading.textContent = text;
        this.page.appendChild(heading);
    }

    addButton(label, callback, options = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "settings-action-button";
        button.textContent = label;
        button.disabled = Boolean(options.disabled);
        if (options.disabled) {
            button.title = options.tooltip || "Not implemented yet";
        }
        button.onclick = callback;
        this.page.appendChild(button);
        return button;
    }

    setStatus(message) {
        if (this.status !== null) {
            this.status.textContent = message;
        }
    }

    close() {
        if (this.backdrop === null) {
            return;
        }
        this.activeEntry?.deactivate();
        ActionRegistry.removeChangedListener(this.changedListener);
        if (this.dialogMover !== null) {
            this.dialogMover.destroy();
        }
        this.backdrop.remove();
        this.backdrop = null;
        this.dialog = null;
        this.page = null;
        this.status = null;
        this.search = null;
        this.shortcutList = null;
        this.fontList = null;
        this.assetPackList = null;
        this.pluginList = null;
        this.uiFontSelect = null;
        this.uiAssetPackSelect = null;
        this.fontAddButton = null;
        this.fontClearButton = null;
        this.fontDropZone = null;
        this.fontImportPanel = null;
        this.fontImportLabel = null;
        this.fontImportBar = null;
        this.dialogMover = null;
        this.activeEntry = null;
    }
}

SettingsDialog.instance = null;
AppSettingsStore.apply();
AppSettingsStore.watchSystemColorScheme();
