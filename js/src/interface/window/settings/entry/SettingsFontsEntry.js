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

class SettingsFontsEntry extends SettingsEntry {

    render() {
        this.addHeading("Fonts", "Add fonts for the Text tool. Font files are stored locally in this app and are not uploaded.");

        // Font actions
        const controls = document.createElement("div");
        controls.className = "settings-font-controls";
        {
            // File input
            const input = document.createElement("input");
            input.type = "file";
            input.accept = FontManager.getAcceptedFileTypes();
            input.multiple = true;
            input.hidden = true;
            input.onchange = async () => {
                await this.importFonts(Array.from(input.files || []));
                input.value = "";
            };

            // Add button
            this.fontAddButton = document.createElement("button");
            this.fontAddButton.type = "button";
            this.fontAddButton.className = "settings-action-button";
            this.fontAddButton.textContent = "Add fonts…";
            this.fontAddButton.onclick = () => input.click();

            // Clear button
            this.fontClearButton = document.createElement("button");
            this.fontClearButton.type = "button";
            this.fontClearButton.className = "settings-action-button settings-font-clear";
            this.fontClearButton.textContent = "Clear all";
            this.fontClearButton.onclick = () => this.clearAllFonts();

            controls.append(this.fontAddButton, this.fontClearButton, input);
        }
        this.page.appendChild(controls);

        // Drop zone
        const dropZone = document.createElement("div");
        dropZone.className = "settings-font-drop-zone";
        dropZone.tabIndex = 0;
        dropZone.textContent = "Drop .ttf, .otf, .woff, or .woff2 files here";
        dropZone.ondragenter = dropZone.ondragover = event => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add("drag-over");
            if (event.dataTransfer !== null) {
                event.dataTransfer.dropEffect = "copy";
            }
        };
        dropZone.ondragleave = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!dropZone.contains(event.relatedTarget)) {
                dropZone.classList.remove("drag-over");
            }
        };
        dropZone.ondrop = async event => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove("drag-over");
            await this.importFonts(Array.from(event.dataTransfer?.files || []));
        };
        this.fontDropZone = dropZone;
        this.page.appendChild(dropZone);

        // Import progress
        const progressPanel = document.createElement("div");
        progressPanel.className = "settings-font-import-progress";
        progressPanel.setAttribute("role", "status");
        progressPanel.setAttribute("aria-live", "polite");
        {
            const spinner = document.createElement("span");
            spinner.className = "settings-font-import-spinner";
            spinner.setAttribute("aria-hidden", "true");

            const progressBody = document.createElement("div");
            {
                this.fontImportLabel = document.createElement("span");
                this.fontImportBar = document.createElement("progress");
                this.fontImportBar.max = 1;
                this.fontImportBar.value = 0;
                progressBody.append(this.fontImportLabel, this.fontImportBar);
            }
            progressPanel.append(spinner, progressBody);
        }
        this.page.appendChild(progressPanel);
        this.fontImportPanel = progressPanel;
        this.updateFontImportProgress();

        // Installed fonts
        this.addSectionHeading("Installed by you");
        this.fontList = document.createElement("div");
        this.fontList.className = "settings-font-list";
        this.page.appendChild(this.fontList);
        FontManager.initialize().then(() => this.renderFontRows());
        this.renderFontRows();
    }

    async importFonts(files) {
        const fontFiles = files.filter(file => FontManager.isFontFile(file));
        if (fontFiles.length === 0) {
            this.setStatus("Choose a TTF, OTF, WOFF, or WOFF2 font file.");
            return null;
        }
        if (this.fontImporting) {
            this.setStatus("Wait for the current font import to finish.");
            return null;
        }
        this.fontImporting = true;
        this.fontImportState = {completed: 0, total: fontFiles.length, file: null, phase: "preparing"};
        this.updateFontImportProgress();
        this.setStatus(`Preparing to add ${fontFiles.length} font${fontFiles.length === 1 ? "" : "s"}…`);
        try {
            const result = await FontManager.importFiles(fontFiles, state => {
                this.fontImportState = state;
                this.updateFontImportProgress();
                if (state.phase === "adding") {
                    this.setStatus(`Adding font ${state.completed + 1} of ${state.total}: ${state.file.name}`);
                }
            });
            if (result.errors.length > 0) {
                const details = result.errors.map(item =>
                    `${item.file.name}: ${item.error.message}`).join("\n");
                this.setStatus(`Added ${result.added.length}; ${result.errors.length} could not be added.`);
                alert("Some fonts could not be added:\n\n" + details);
            } else {
                this.setStatus(result.added.length === 1
                    ? `Added ${result.added[0].name}.`
                    : `Added ${result.added.length} fonts.`);
            }
            const addedFont = result.added[result.added.length - 1] || null;
            this.renderFontRows(addedFont?.id || null);
            return result;
        } finally {
            this.fontImporting = false;
            this.fontImportState = null;
            this.updateFontImportProgress();
        }
    }

    updateFontImportProgress() {
        const state = this.fontImportState;
        if (this.fontAddButton !== null) {
            this.fontAddButton.disabled = this.fontImporting;
        }
        if (this.fontClearButton !== null) {
            this.fontClearButton.disabled = this.fontImporting
                || FontManager.isInitializing() || FontManager.getFonts().length === 0;
        }
        if (this.fontDropZone !== null) {
            this.fontDropZone.classList.toggle("busy", this.fontImporting);
            this.fontDropZone.setAttribute("aria-busy", String(this.fontImporting));
        }
        if (this.fontImportPanel === null) {
            return;
        }
        this.fontImportPanel.hidden = state === null;
        if (state === null) {
            return;
        }

        this.fontImportBar.max = Math.max(1, state.total);
        this.fontImportBar.value = state.completed;
        this.fontImportLabel.textContent = state.file === null
            ? `Preparing ${state.total} font${state.total === 1 ? "" : "s"}…`
            : `Adding ${state.completed + (state.phase === "adding" ? 1 : 0)} of ${state.total}: ${state.file.name}`;
    }

    renderFontRows(scrollToId = null) {
        if (this.fontList === null || !this.fontList.isConnected) {
            return;
        }
        this.stopFontRendering();
        this.fontList.innerHTML = "";
        const fonts = FontManager.getFonts();
        if (this.fontClearButton !== null) {
            this.fontClearButton.disabled = this.fontImporting
                || FontManager.isInitializing() || fonts.length === 0;
        }
        if (fonts.length === 0) {
            const empty = document.createElement("div");
            empty.className = "settings-empty-list settings-font-empty";
            empty.textContent = FontManager.isInitializing()
                ? "Loading installed fonts…"
                : "No custom fonts have been added.";
            this.fontList.appendChild(empty);
            return;
        }

        const token = ++this.fontRenderToken;
        this.fontPreviewObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) {
                    continue;
                }
                const preview = entry.target;
                this.fontPreviewObserver?.unobserve(preview);
                FontManager.ensureLoaded(preview.dataset.fontId).then(face => {
                    if (face !== null && preview.isConnected && token === this.fontRenderToken) {
                        preview.style.fontFamily = `'${face.family.replace(/'/g, "\\'")}', sans-serif`;
                    }
                }).catch(error => {
                    console.warn(`Could not load font preview "${preview.dataset.fontName}"`, error);
                });
            }
        }, {root: this.page, rootMargin: "160px"});

        let index = 0;
        let pendingScrollId = scrollToId;
        const appendChunk = () => {
            if (token !== this.fontRenderToken || this.fontList === null
                || !this.fontList.isConnected) {
                return;
            }
            const fragment = document.createDocumentFragment();
            let addedRow = null;
            const end = Math.min(index + 20, fonts.length);
            for (; index < end; ++index) {
                const font = fonts[index];
                const row = this.createFontRow(font);
                fragment.appendChild(row);
                if (font.id === pendingScrollId) {
                    addedRow = row;
                    pendingScrollId = null;
                }
            }
            this.fontList.appendChild(fragment);
            this.scrollToAddedRow(addedRow);
            if (index < fonts.length) {
                requestAnimationFrame(appendChunk);
            }
        };
        appendChunk();
    }

    createFontRow(font) {
        const row = document.createElement("article");
        row.className = "settings-font-row";
        {
            // Font details
            const details = document.createElement("div");
            details.className = "settings-font-details";
            {
                const name = document.createElement("strong");
                name.textContent = font.name;

                const metadata = document.createElement("span");
                metadata.textContent = `${font.fileName} · ${this.formatFileSize(font.size)}`;
                details.append(name, metadata);
            }

            // Preview
            const preview = document.createElement("div");
            preview.className = "settings-font-preview";
            preview.dataset.fontId = font.id;
            preview.dataset.fontName = font.name;
            preview.textContent = "The quick brown fox jumps over the lazy dog 0123456789";
            this.fontPreviewObserver?.observe(preview);

            // Remove button
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "settings-font-remove";
            remove.textContent = "Remove";
            remove.onclick = async () => {
                remove.disabled = true;
                try {
                    await FontManager.removeFont(font.id);
                    this.setStatus(`Removed ${font.name}.`);
                } catch (error) {
                    remove.disabled = false;
                    this.setStatus(`Could not remove ${font.name}.`);
                    alert(`Could not remove "${font.name}": ${error.message}`);
                }
            };
            row.append(details, preview, remove);
        }
        return row;
    }

    stopFontRendering() {
        ++this.fontRenderToken;
        this.fontPreviewObserver?.disconnect();
        this.fontPreviewObserver = null;
    }

    async clearAllFonts() {
        const count = FontManager.getFonts().length;
        if (count === 0 || this.fontImporting || FontManager.isInitializing()) {
            return;
        }
        const choice = await TaskDialog.show({
            title: "Clear Installed Fonts",
            icon: "assets/icons/warning_icon.png",
            message: `Remove all ${count} custom fonts from paint.js? This cannot be undone.`,
            cancelValue: "cancel",
            choices: [
                {
                    value: "clear",
                    title: "Clear All Fonts",
                    description: "Delete every custom font stored by paint.js.",
                    icon: "assets/icons/trash_can.png"
                },
                {
                    value: "cancel",
                    title: "Cancel",
                    description: "Keep the installed fonts.",
                    icon: "assets/icons/cancel_icon.png"
                }
            ]
        });
        if (choice !== "clear") {
            return;
        }

        this.fontClearButton.disabled = true;
        this.setStatus(`Removing ${count} fonts…`);
        try {
            const removed = await FontManager.removeAllFonts();
            this.setStatus(`Removed ${removed} custom fonts.`);
        } catch (error) {
            console.error("Could not clear custom fonts", error);
            this.setStatus("Could not clear the custom fonts.");
            this.fontClearButton.disabled = false;
        }
    }

    formatFileSize(size) {
        if (size < 1024) {
            return size + " B";
        }
        if (size < 1024 * 1024) {
            return (size / 1024).toFixed(1) + " KB";
        }
        return (size / (1024 * 1024)).toFixed(1) + " MB";
    }

    deactivate() {
        this.stopFontRendering();
    }
}
