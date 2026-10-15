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

class SettingsIconPacksEntry extends SettingsEntry {

    render() {
        this.addHeading("Icon Packs", "Install local icon packs containing icons, images, cursors, or translations.");
        this.addNote("Icon packs stay on this device. Only install packs whose contents you have permission to use.");

        // Asset-pack actions
        const controls = document.createElement("div");
        controls.className = "settings-asset-controls";
        {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".zip,application/zip,application/x-zip-compressed";
            input.hidden = true;
            input.onchange = async () => {
                if (input.files !== null && input.files.length > 0) {
                    await this.importAssetPack(input.files[0]);
                }
                input.value = "";
            };

            const add = document.createElement("button");
            add.type = "button";
            add.className = "settings-action-button";
            add.textContent = "Install icon pack…";
            add.onclick = () => input.click();

            const reload = document.createElement("button");
            reload.type = "button";
            reload.className = "settings-action-button settings-asset-reload";
            reload.textContent = "Reload translations";
            reload.onclick = () => window.location.reload();
            controls.append(add, reload, input);
        }
        this.page.appendChild(controls);

        // Drop zone
        const dropZone = document.createElement("div");
        dropZone.className = "settings-font-drop-zone settings-asset-drop-zone";
        dropZone.tabIndex = 0;
        dropZone.textContent = "Drop an icon-pack ZIP here";
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
            const files = Array.from(event.dataTransfer?.files || []);
            if (files.length > 0) {
                await this.importAssetPack(files[0]);
            }
        };
        this.page.appendChild(dropZone);

        let documentation = this.addNote("");
        documentation.classList.add("settings-asset-documentation");
        let documentationLink = document.createElement("a");
        documentationLink.href = "https://github.com/LabyStudio/paintdotjs/blob/master/docs/asset-packs.md";
        documentationLink.target = "_blank";
        documentationLink.rel = "noopener noreferrer";
        documentationLink.textContent = "Learn how to create your own icon pack";
        documentation.appendChild(documentationLink);
        this.addSectionHeading("Installed icon packs");
        this.assetPackList = document.createElement("div");
        this.assetPackList.className = "settings-asset-list";
        this.page.appendChild(this.assetPackList);
        this.renderAssetPackRows();
    }

    async importAssetPack(file) {
        if (this.assetPackImporting) {
            this.setStatus("Wait for the current icon-pack import to finish.");
            return;
        }
        this.assetPackImporting = true;
        this.setStatus(`Installing ${file.name}…`);
        try {
            const pack = await AssetPackManager.importFile(file);
            this.setStatus(`Installed and activated ${pack.name}. Reload to apply its translations.`);
            this.renderAssetPackRows(pack.id);
        } catch (error) {
            console.error("Could not install icon pack", error);
            this.setStatus("Could not install the icon pack.");
            ErrorForm.report(error, `Could not install ${file.name}`);
        } finally {
            this.assetPackImporting = false;
        }
    }

    renderAssetPackRows(scrollToId = null) {
        if (this.assetPackList === null || !this.assetPackList.isConnected) {
            return;
        }
        this.clearAssetPackPreviewUrls();
        this.assetPackList.innerHTML = "";
        const activeId = AssetPackManager.getActivePackId();
        for (const pack of AssetPackManager.getPacks()) {
            const row = document.createElement("article");
            row.className = "settings-asset-row";
            {
                const details = document.createElement("div");
                details.className = "settings-asset-details";
                {
                    const name = document.createElement("strong");
                    name.textContent = pack.name;

                    const metadata = document.createElement("span");
                    const author = pack.author ? ` by ${pack.author}` : "";
                    const imageLabel = pack.iconCount === 1 ? "image" : "images";
                    const languageLabel = pack.localeCount === 1 ? "language" : "languages";
                    metadata.textContent = `${pack.version}${author} · ${pack.iconCount} ${imageLabel} · ${pack.localeCount} ${languageLabel}`;
                    details.append(name, metadata);
                    if (pack.description) {
                        const description = document.createElement("span");
                        description.textContent = pack.description;
                        details.appendChild(description);
                    }
                    details.appendChild(this.createAssetPackPreview(pack));
                }

                const activate = document.createElement("button");
                activate.type = "button";
                activate.className = "settings-action-button";
                activate.textContent = pack.id === activeId ? "Active" : "Use";
                activate.disabled = pack.id === activeId;
                activate.onclick = async () => {
                    await AssetPackManager.activate(pack.id);
                    this.setStatus(`Activated ${pack.name}. Reload to apply translations.`);
                    this.renderAssetPackRows();
                };
                row.append(details, activate);

                let remove = document.createElement("button");
                remove.type = "button";
                remove.className = "settings-font-remove settings-asset-remove";
                remove.setAttribute("aria-label", `Remove ${pack.name}`);
                {
                    const removeIcon = document.createElement("img");
                    removeIcon.src = "assets/icons/cancel_icon.png";
                    removeIcon.alt = "";
                    remove.appendChild(removeIcon);
                }
                const removable = pack.id !== "default" && !pack.builtIn;
                remove.disabled = !removable;
                if (!removable) {
                    remove.title = "Built-in icon packs cannot be removed";
                } else {
                    remove.title = `Remove ${pack.name}`;
                    remove.onclick = async () => {
                        await AssetPackManager.remove(pack.id);
                        this.setStatus(`Removed ${pack.name}.`);
                        this.renderAssetPackRows();
                    };
                }
                row.appendChild(remove);
            }
            this.assetPackList.appendChild(row);
            if (pack.id === scrollToId) {
                this.scrollToAddedRow(row);
            }
        }
    }

    createAssetPackPreview(pack) {
        let preview = document.createElement("div");
        preview.className = "settings-asset-preview";
        let files = AssetPackManager.getPreviewFiles(pack.id);
        if (files.length === 0) {
            let empty = document.createElement("span");
            empty.className = "settings-asset-preview-empty";
            empty.textContent = "Translations only";
            preview.appendChild(empty);
            return preview;
        }
        for (let file of files) {
            let image = document.createElement("img");
            image.alt = "";
            image.draggable = false;
            image.title = file.path.replace(/^assets\/(?:icons|images|cursors)\//, "");
            if (file.data === null) {
                image.src = new URL(file.path, document.baseURI).href;
            } else {
                let url = URL.createObjectURL(new Blob([file.data], {type: file.type}));
                this.assetPackPreviewUrls.push(url);
                image.src = url;
            }
            preview.appendChild(image);
        }
        return preview;
    }

    clearAssetPackPreviewUrls() {
        for (let url of this.assetPackPreviewUrls) {
            URL.revokeObjectURL(url);
        }
        this.assetPackPreviewUrls = [];
    }

    deactivate() {
        this.clearAssetPackPreviewUrls();
    }
}
