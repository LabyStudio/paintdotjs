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

class DocumentIO {

    static initialize(app) {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        this.app = app;

        window.addEventListener("beforeunload", event => {
            if (isApp || !app.hasUnsavedDocuments() || Date.now() < this.allowWebCloseUntil) {
                return;
            }
            event.preventDefault();
            event.returnValue = "";
            this.scheduleWebCloseDialog();
        });
        // Browser image elements are draggable by default. App icons can then
        // arrive at the document drop handler as file payloads and accidentally
        // open the icon itself. External file drags do not originate here, so
        // cancelling native drags for UI images keeps normal file import intact.
        document.addEventListener("dragstart", event => {
            if (event.target instanceof HTMLImageElement) {
                event.preventDefault();
            }
        });
        document.addEventListener("dragover", event => {
            if (event.dataTransfer !== null && Array.from(event.dataTransfer.types).includes("Files")) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            }
        });
        document.addEventListener("drop", event => {
            const files = event.dataTransfer === null ? [] : Array.from(event.dataTransfer.files || []);
            if (files.length === 0) {
                return;
            }
            event.preventDefault();
            this.handleDroppedFiles(files);
        });
        document.addEventListener("paste", event => {
            if (event.defaultPrevented || event.clipboardData === null) {
                return;
            }
            const image = Array.from(event.clipboardData.items || []).find(item => item.type.startsWith("image/"));
            if (image === undefined) {
                return;
            }
            const file = image.getAsFile();
            if (file !== null) {
                event.preventDefault();
                this.pasteBlob(file);
            }
        });
    }

    static scheduleWebCloseDialog() {
        if (this.webCloseDialogScheduled || this.webCloseDialogOpen) {
            return;
        }
        this.webCloseDialogScheduled = true;
        setTimeout(async () => {
            this.webCloseDialogScheduled = false;
            if (!this.app.hasUnsavedDocuments() || this.webCloseDialogOpen) {
                return;
            }
            this.webCloseDialogOpen = true;
            try {
                const dirtyWorkspaces = this.app.getDocumentWorkspaces()
                    .filter(workspace => workspace.isDirty());
                const choice = await this.showUnsavedChangesDialog(dirtyWorkspaces, false);
                if (choice === "save") {
                    if (await this.saveAll()) {
                        this.exitWebApp();
                    }
                } else if (choice === "discard") {
                    this.exitWebApp();
                }
            } finally {
                this.webCloseDialogOpen = false;
            }
        }, 0);
    }

    static exitWebApp() {
        // Browsers only permit scripts to close script-opened tabs. Try to close first;
        // if this is a normal user-opened tab, leave the app instead of doing nothing.
        this.allowWebCloseUntil = Date.now() + 10000;
        window.close();
        setTimeout(() => {
            if (!document.hidden) {
                window.location.replace("about:blank");
            }
        }, 100);
    }

    static createUnsavedChangesPreview(workspaces, explanationText = null) {
        const preview = document.createElement("div");
        preview.className = "unsaved-changes-preview";
        {
            // Explanation
            const explanation = document.createElement("p");
            explanation.textContent = explanationText ||
                "The following images have changes that have not been saved. " +
                "Select a thumbnail to show that image in the main window.";

            // Thumbnails
            const strip = document.createElement("div");
            strip.className = "unsaved-changes-thumbnails";
            const buttons = [];
            const selectWorkspace = workspace => {
                this.app.setActiveDocumentWorkspace(workspace);
                for (const entry of buttons) {
                    entry.button.classList.toggle("selected", entry.workspace === workspace);
                }
            };
            for (const workspace of workspaces) {
                workspace.updateComposition();
                const source = workspace.getCompositionSurface().getCanvas();
                const button = document.createElement("button");
                button.type = "button";
                button.className = "unsaved-changes-thumbnail";
                button.title = workspace.getFriendlyName();
                {
                    // Preview
                    const canvas = document.createElement("canvas");
                    const scale = Math.min(1, 80 / source.width, 64 / source.height);
                    canvas.width = Math.max(1, Math.round(source.width * scale));
                    canvas.height = Math.max(1, Math.round(source.height * scale));
                    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);

                    // Name
                    const name = document.createElement("span");
                    name.textContent = workspace.getFriendlyName();
                    button.append(canvas, name);
                }
                button.onclick = () => selectWorkspace(workspace);
                strip.appendChild(button);
                buttons.push({button, workspace});
            }
            preview.append(explanation, strip);
            selectWorkspace(this.app.getActiveDocumentWorkspace());
        }
        return preview;
    }

    static showUnsavedChangesDialog(workspaces, canCloseImmediately = true) {
        return TaskDialog.show({
            title: "Unsaved Changes",
            className: "unsaved-changes-dialog",
            icon: "assets/icons/warning_icon.png",
            preview: this.createUnsavedChangesPreview(workspaces),
            cancelValue: "cancel",
            choices: [{
                value: "save",
                title: "Save",
                description: "Save the images listed above, and then exit.",
                icon: "assets/icons/menu_file_save_all_icon.png"
            }, {
                value: "discard",
                title: "Don't Save",
                description: canCloseImmediately
                    ? "Discard all unsaved changes, and then exit."
                    : "Discard all unsaved changes, and then exit paint.js.",
                icon: "assets/icons/menu_file_close_icon.png"
            }, {
                value: "cancel",
                title: "Cancel",
                description: "Go back to paint.js.",
                icon: "assets/icons/cancel_icon.png"
            }]
        });
    }

    static async closeDocumentWorkspace(workspace) {
        if (workspace === null || !this.app.getDocumentWorkspaces().includes(workspace)) {
            return false;
        }

        this.closingWorkspaces ??= new Set();
        if (this.closingWorkspaces.has(workspace)) {
            return false;
        }
        this.closingWorkspaces.add(workspace);

        try {
            if (workspace.isDirty()) {
                // Saving always operates on the active workspace. This also mirrors
                // Paint.NET, which activates a document before asking whether to save it.
                this.app.setActiveDocumentWorkspace(workspace);
                const choice = await TaskDialog.show({
                    title: "Unsaved Changes",
                    className: "unsaved-changes-dialog",
                    icon: "assets/icons/warning_icon.png",
                    preview: this.createUnsavedChangesPreview(
                        [workspace],
                        "Save changes to \"" + workspace.getFriendlyName() + "\" before closing?"
                    ),
                    cancelValue: "cancel",
                    choices: [{
                        value: "save",
                        title: "Save",
                        description: "Save the image, and then close it.",
                        icon: "assets/icons/menu_file_save_icon.png"
                    }, {
                        value: "discard",
                        title: "Don't Save",
                        description: "Discard the unsaved changes, and then close the image.",
                        icon: "assets/icons/menu_file_close_icon.png"
                    }, {
                        value: "cancel",
                        title: "Cancel",
                        description: "Keep the image open.",
                        icon: "assets/icons/cancel_icon.png"
                    }]
                });

                if (choice !== "save" && choice !== "discard") {
                    return false;
                }
                if (choice === "save" && !await this.saveActive(false)) {
                    return false;
                }
            }

            return this.app.closeDocumentWorkspace(workspace, false);
        } finally {
            this.closingWorkspaces.delete(workspace);
        }
    }

    static async createNewDocument() {
        const active = this.app.getActiveDocumentWorkspace();
        let width = active === null ? 800 : active.getDocument().getWidth();
        let height = active === null ? 600 : active.getDocument().getHeight();
        const clipboardSize = await this.getClipboardImageSize();
        if (clipboardSize !== null) {
            width = clipboardSize.width;
            height = clipboardSize.height;
        }
        const result = await NewFileDialog.open(width, height);
        if (result !== null) {
            this.app.createBlankDocumentInNewWorkspace(
            result.width, result.height, result.resolution);
        }
    }

    static async getClipboardImageSize() {
        const nativeReader = window.desktopFileActions?.getClipboardImageSize;
        if (typeof nativeReader === "function") {
            try {
                const size = nativeReader();
                return size !== null && Number.isFinite(size.width) && Number.isFinite(size.height)
                    && size.width > 0 && size.height > 0
                    ? {width: Math.round(size.width), height: Math.round(size.height)}
                    : null;
            } catch (_) {
                // Fall through to the browser clipboard implementation.
            }
        }

        const blob = await this.readClipboardImage();
        if (blob === null) {
            return null;
        }

        let image = null;
        try {
            image = await this.loadImage(blob);
            return image.width > 0 && image.height > 0
                ? {width: image.width, height: image.height}
                : null;
        } catch (_) {
            return null;
        } finally {
            if (image !== null && typeof image.close === "function") {
                image.close();
            }
        }
    }

    static async openFilePicker() {
        if (typeof window.showOpenFilePicker === "function") {
            try {
                let handles;
                try {
                    handles = await window.showOpenFilePicker({
                        multiple: true,
                        types: [{
                            description: "Images",
                            accept: {
                                "image/png": [".png"],
                                "image/jpeg": [".jpg", ".jpeg"],
                                "image/webp": [".webp"],
                                "image/gif": [".gif"],
                                "image/bmp": [".bmp"],
                                "image/avif": [".avif"],
                                "image/tiff": [".tif", ".tiff"],
                                "application/octet-stream": [
                                    ".pdn", ".jxl", ".heic", ".heif", ".dds",
                                    ".tga", ".jxr", ".wdp", ".wmp"
                                ]
                            }
                        }]
                    });
                } catch (error) {
                    // Some Chromium versions reject uncommon but valid extensions.
                    if (!(error instanceof TypeError)) {
                        throw error;
                    }
                    handles = await window.showOpenFilePicker({multiple: true});
                }
                const files = [];
                for (const handle of handles) {
                    const file = await handle.getFile();
                    this.openedFileHandles.set(file, handle);
                    files.push(file);
                }
                await this.openFiles(files);
                return;
            } catch (error) {
                if (error.name === "AbortError") {
                    return;
                }
                // Fall back to the broadly supported input picker if the File
                // System Access API is unavailable in this browser context.
                if (error.name !== "SecurityError" && error.name !== "NotAllowedError") {
                    throw error;
                }
            }
        }

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,image/heic,image/tiff," +
            ".jxl,.heif,.dds,.tif,.tiff,.tga,.jxr,.wdp,.wmp,.pdn,application/json";
        input.multiple = true;
        input.onchange = () => this.openFiles(Array.from(input.files || []));
        input.click();
    }

    static openLayerFilePicker() {
        if (this.app.getActiveDocumentWorkspace() === null) {
            return;
        }

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,image/heic,image/tiff," +
            ".jxl,.heif,.dds,.tif,.tiff,.tga,.jxr,.wdp,.wmp,.pdn,application/json";
        input.multiple = true;
        input.onchange = async () => {
            for (const file of Array.from(input.files || [])) {
                try {
                    await this.addFileAsLayer(file);
                } catch (error) {
                    alert("Could not add \"" + file.name + "\" as a layer: " + error.message);
                }
            }
        };
        input.click();
    }

    static async handleDroppedFiles(files) {
        const fontFiles = files.filter(file => FontManager.isFontFile(file));
        if (fontFiles.length > 0) {
            if (fontFiles.length === files.length) {
                SettingsDialog.open("fonts");
                await SettingsDialog.instance.importFonts(fontFiles);
                return;
            }
            const result = await FontManager.importFiles(fontFiles);
            if (result.errors.length > 0) {
                alert("Some fonts could not be added:\n\n" + result.errors.map(item =>
                    `${item.file.name}: ${item.error.message}`).join("\n"));
            }
            files = files.filter(file => !FontManager.isFontFile(file));
            if (files.length === 0) {
                SettingsDialog.open("fonts");
                const message = result.added.length === 1
                    ? `Added ${result.added[0].name}.`
                    : `Added ${result.added.length} fonts.`;
                SettingsDialog.instance.setStatus(message);
                return;
            }
        }
        const choice = await TaskDialog.show({
            title: "Drag and Drop",
            icon: "assets/icons/drag_drop_open_or_import_form_icon.png",
            message: "What would you like to do with the file" + (files.length === 1 ? "?" : "s?"),
            cancelValue: "cancel",
            choices: [
                {
                    value: "open",
                    title: "Open",
                    description: files.length === 1 ? "Opens the image." : "Opens the images.",
                    icon: "assets/icons/menu_file_open_icon.png"
                },
                {
                    value: "layer",
                    title: "Add layer" + (files.length === 1 ? "" : "s"),
                    description: "Loads the image and adds it as a new layer in the current image.",
                    icon: "assets/icons/menu_layers_add_new_layer_icon.png"
                },
                {
                    value: "cancel",
                    title: "Cancel",
                    description: "Cancels the action.",
                    icon: "assets/icons/menu_edit_undo_icon.png"
                }
            ]
        });
        if (choice === "open") {
            await this.openFiles(files);
        }
        if (choice === "layer") {
            for (const file of files) {
                try {
                    await this.addFileAsLayer(file);
                } catch (error) {
                    alert("Could not add \"" + file.name + "\" as a layer: " + error.message);
                }
            }
        }
    }

    static async openFiles(files) {
        for (const file of files) {
            try {
                if (file.name.toLowerCase().endsWith(".pdn")) {
                    await this.openPdn(file);
                }
                else {
                    await this.openImage(file);
                }
            } catch (error) {
                alert("Could not open \"" + file.name + "\": " + error.message);
            }
        }
    }

    static async loadImage(blob) {
        let nativeError = null;
        if (typeof createImageBitmap === "function") {
            try {
                return await createImageBitmap(blob);
            } catch (error) {
                nativeError = error;
            }
        } else {
            try {
                return await this.loadImageElement(blob);
            } catch (error) {
                nativeError = error;
            }
        }

        if (window.portableImageCodec?.decode !== undefined) {
            const format = this.getImageFormat(blob);
            if (format !== null) {
                const bytes = new Uint8Array(await blob.arrayBuffer());
                const decoded = await window.portableImageCodec.decode(bytes, format);
                const canvas = document.createElement("canvas");
                canvas.width = decoded.width;
                canvas.height = decoded.height;
                canvas.getContext("2d").putImageData(
                    new ImageData(decoded.rgba, decoded.width, decoded.height), 0, 0);
                return canvas;
            }
        }
        throw nativeError || new Error("Unsupported image format");
    }

    static loadImageElement(blob) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const url = URL.createObjectURL(blob);
            image.onload = () => {
                URL.revokeObjectURL(url);
                resolve(image);
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Unsupported image format"));
            };
            image.src = url;
        });
    }

    static getImageFormat(blob) {
        const name = String(blob?.name || "").toLowerCase();
        const extension = name.match(/\.([^.]+)$/)?.[1];
        if (extension !== undefined) {
            return extension;
        }
        return {
            "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp",
            "image/gif": "gif", "image/bmp": "bmp", "image/avif": "avif",
            "image/heic": "heic", "image/heif": "heif", "image/jxl": "jxl",
            "image/vnd-ms.dds": "dds", "image/tiff": "tiff", "image/x-tga": "tga",
            "image/vnd.ms-photo": "jxr"
        }[String(blob?.type || "").toLowerCase()] || null;
    }

    static async openImage(file) {
        const image = await this.loadImage(file);
        const workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
        const layer = workspace.getActiveLayer();
        layer.getSurface().clear();
        layer.getSurface().context.drawImage(image, 0, 0);
        layer.properties.name = file.name.replace(/\.[^.]+$/, "") || i18n("layer.backgroundLayer.defaultName");
        workspace.setFileInfo(
            file.name,
            this.openedFileHandles.get(file) || null,
            this.getLocalFilePath(file)
        );
        workspace.setDirty(false);
        workspace.getDocument().invalidate();
        workspace.fitViewport();
        if (typeof image.close === "function") {
            image.close();
        }
        return workspace;
    }

    static async addFileAsLayer(file) {
        if (file.name.toLowerCase().endsWith(".pdn")) {
            const data = await this.readPdn(file);
            let workspace = this.app.getActiveDocumentWorkspace();
            if (workspace === null) {
                await this.createWorkspaceFromPdnData(data, file.name, this.getLocalFilePath(file));
                return;
            }
            this.finishActiveTool();
            const documentModel = workspace.getDocument();
            let index = documentModel.getLayers().getLayerCount();
            for (const saved of data.layers) {
                const layer = this.createLayerFromPdnData(workspace, saved,
                    documentModel.getWidth(), documentModel.getHeight());
                documentModel.getLayers().insertLayerAt(index++, layer);
                workspace.setActiveLayer(layer);
            }
            workspace.setDirty(true);
            documentModel.invalidate();
            return;
        }
        const image = await this.loadImage(file);
        let workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
        }
        this.finishActiveTool();
        let documentModel = workspace.getDocument();
        const expandedWidth = Math.max(documentModel.getWidth(), image.width);
        const expandedHeight = Math.max(documentModel.getHeight(), image.height);
        if (expandedWidth !== documentModel.getWidth() || expandedHeight !== documentModel.getHeight()) {
            this.resizeCanvas(workspace, expandedWidth, expandedHeight);
            documentModel = workspace.getDocument();
        }
        const layer = Layer.createLayer(workspace, documentModel.getWidth(), documentModel.getHeight(), file.name);
        layer.getSurface().context.drawImage(image, 0, 0);
        const index = workspace.getActiveLayer() === null
            ? documentModel.getLayers().getLayerCount()
            : workspace.getActiveLayerIndex() + 1;
        documentModel.getLayers().insertLayerAt(index, layer);
        workspace.setActiveLayer(layer);
        workspace.setDirty(true);
        documentModel.invalidate();
        if (typeof image.close === "function") {
            image.close();
        }
    }

    static async saveActive(saveAs = false) {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            return false;
        }
        this.finishActiveTool();
        const layered = workspace.getDocument().getLayers().getLayerCount() > 1;
        let format = workspace.fileFormat === null
            ? SaveImageDialog.fromFileName(workspace.fileName, layered ? "pdn" : "png")
            : SaveImageDialog.find(workspace.fileFormat);
        if (layered && format.id !== "pdn" && !saveAs) {
            format = SaveImageDialog.find("pdn");
        }

        let options = {...(workspace.saveOptions || {})};
        let configuredBlob = null;
        if (saveAs || format.id === "jpeg") {
            workspace.updateComposition();
            const selection = await SaveImageDialog.open({
                canvas: workspace.getCompositionSurface().getCanvas(),
                initialFormat: format.id,
                initialOptions: options,
                encode: (formatId, encodeOptions) => formatId === "pdn"
                    ? this.serializePdn(workspace)
                    : ImageEncoder.encode(workspace.getCompositionSurface().getCanvas(), formatId, encodeOptions)
            });
            if (selection === null) {
                return false;
            }
            format = SaveImageDialog.find(selection.format);
            options = selection.options;
            configuredBlob = selection.blob;
        } else if (format.quality !== undefined && options.quality === undefined) {
            options.quality = format.quality;
        }

        const friendlyName = workspace.getFriendlyName() === i18n("untitled.friendlyName")
            ? "Untitled" : workspace.getFriendlyName().replace(/\.[^.]+$/, "");
        const baseName = friendlyName + format.extension;
        const extensions = format.extensions || [format.extension];
        const hasExpectedExtension = name => extensions.some(extension =>
            String(name || "").toLowerCase().endsWith(extension));
        let handle = !saveAs ? workspace.fileHandle : null;
        if (handle !== null && !hasExpectedExtension(handle.name)) {
            handle = null;
        }
        let localFilePath = !saveAs && handle === null
            && typeof window.desktopFileActions?.writeFile === "function"
            && hasExpectedExtension(workspace.getFilePath())
            ? workspace.getFilePath()
            : null;
        if (handle === null && localFilePath === null && typeof window.showSaveFilePicker === "function") {
            try {
                try {
                    handle = await window.showSaveFilePicker({
                        suggestedName: baseName,
                        types: [{description: format.name, accept: {[format.mime]: extensions}}]
                    });
                } catch (error) {
                    // Some Chromium versions reject uncommon but valid MIME types.
                    if (!(error instanceof TypeError)) {
                        throw error;
                    }
                    handle = await window.showSaveFilePicker({suggestedName: baseName});
                }
            } catch (error) {
                if (error.name === "AbortError") {
                    return false;
                }
                throw error;
            }
        }

        let flattenAfterSave = false;
        if (layered && format.id !== "pdn") {
            const choice = await TaskDialog.show({
                title: "Flatten Image",
                icon: "assets/icons/menu_image_flatten_icon.png",
                message: format.name + " cannot preserve layers. Flatten the image after saving?",
                cancelValue: "cancel",
                choices: [{
                    value: "flatten",
                    title: "Flatten and save",
                    description: "Saves the composed image. You can undo the flatten operation afterward.",
                    icon: "assets/icons/menu_image_flatten_icon.png"
                }, {
                    value: "cancel",
                    title: "Cancel",
                    description: "Returns to the image without saving.",
                    icon: "assets/icons/menu_edit_undo_icon.png"
                }]
            });
            if (choice !== "flatten") {
                return false;
            }
            flattenAfterSave = true;
        }

        let blob;
        if (format.id === "pdn") {
            blob = configuredBlob || await this.serializePdn(workspace);
        } else {
            workspace.updateComposition();
            blob = configuredBlob || await ImageEncoder.encode(
                workspace.getCompositionSurface().getCanvas(), format.id, options);
        }
        if (handle !== null) {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            let filePath = null;
            try {
                filePath = this.getLocalFilePath(await handle.getFile());
            } catch (_) {
                // Browsers deliberately hide the local path.
            }
            workspace.setFileInfo(handle.name, handle, filePath, format.id, options);
        } else if (localFilePath !== null) {
            await window.desktopFileActions.writeFile(localFilePath, await blob.arrayBuffer());
            workspace.setFileInfo(
                workspace.fileName || baseName,
                null,
                localFilePath,
                format.id,
                options
            );
        } else {
            this.downloadBlob(blob, baseName);
            workspace.setFileInfo(baseName, null, null, format.id, options);
        }
        if (flattenAfterSave) {
            this.flattenDocument();
        }
        workspace.setDirty(false);
        return true;
    }

    static async saveAll(includeClean = false) {
        const originalWorkspace = this.app.getActiveDocumentWorkspace();
        const workspaces = this.app.getDocumentWorkspaces()
            .filter(workspace => includeClean || workspace.isDirty());

        try {
            for (const workspace of workspaces) {
                this.app.setActiveDocumentWorkspace(workspace);
                if (!await this.saveActive(false)) {
                    return false;
                }
            }
            return true;
        } finally {
            if (originalWorkspace !== null && this.app.getDocumentWorkspaces().includes(originalWorkspace)) {
                this.app.setActiveDocumentWorkspace(originalWorkspace);
            }
        }
    }

    static async printActive() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            return false;
        }

        this.finishActiveTool();
        workspace.updateComposition();
        const blob = await this.canvasToBlob(workspace.getCompositionSurface().getCanvas(), "image/png");
        const url = URL.createObjectURL(blob);
        const printWindow = window.open("", "_blank");
        if (printWindow === null) {
            URL.revokeObjectURL(url);
            alert("The print window was blocked by the browser.");
            return false;
        }

        printWindow.document.open();
        printWindow.document.write(
            "<!doctype html><title>Print</title>" +
            "<style>html,body{margin:0;text-align:center}img{max-width:100%;height:auto}</style>" +
            "<img id=printImage alt=\"\">"
        );
        printWindow.document.close();
        const image = printWindow.document.getElementById("printImage");
        image.onload = () => {
            printWindow.focus();
            printWindow.print();
            URL.revokeObjectURL(url);
        };
        image.src = url;
        return true;
    }

    static async serializePdn(workspace) {
        return PdnDocumentCodec.encode(workspace.getDocument());
    }

    static async openPdn(file) {
        const data = await this.readPdn(file);
        return this.createWorkspaceFromPdnData(
            data,
            file.name,
            this.getLocalFilePath(file),
            this.openedFileHandles.get(file) || null
        );
    }

    static async readPdn(file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (PdnDocumentCodec.isNativePdn(bytes)) {
            return PdnDocumentCodec.decode(bytes);
        }
        let data;
        try {
            data = JSON.parse(new TextDecoder().decode(bytes));
        } catch (_) {
            throw new Error("Unsupported .pdn document format");
        }
        if (data.format !== "paint.js.pdn/1" || !Array.isArray(data.layers)) {
            throw new Error("Unsupported .pdn document format");
        }
        const layers = [];
        for (const saved of data.layers) {
            const response = await fetch(saved.png);
            const image = await this.loadImage(await response.blob());
            const canvas = document.createElement("canvas");
            canvas.width = data.width;
            canvas.height = data.height;
            canvas.getContext("2d").drawImage(image, 0, 0);
            if (typeof image.close === "function") {
                image.close();
            }
            layers.push({...saved, canvas});
        }
        return {
            width: data.width,
            height: data.height,
            resolution: Math.max(0.01, Number(data.resolution) || 96),
            activeLayer: data.activeLayer,
            layers
        };
    }

    static async createWorkspaceFromPdnData(data, fileName, filePath = null, fileHandle = null) {
        const width = Math.max(1, Math.min(32768, Math.round(Number(data.width) || 0)));
        const height = Math.max(1, Math.min(32768, Math.round(Number(data.height) || 0)));
        if (width !== Number(data.width) || height !== Number(data.height)) {
            throw new Error("Invalid .pdn canvas size");
        }
        const resolution = Math.max(0.01, Number(data.resolution) || 96);
        const workspace = this.app.createBlankDocumentInNewWorkspace(width, height, resolution);
        const activeToolType = this.finishActiveTool(false);
        const documentModel = new Document(width, height, resolution);
        try {
            for (const saved of data.layers) {
                documentModel.addLayer(this.createLayerFromPdnData(workspace, saved, width, height));
            }
            if (documentModel.getLayers().getLayerCount() === 0) {
                documentModel.addLayer(Layer.createBackgroundLayer(workspace, width, height));
            }
            const activeLayerIndex = Math.max(0, Math.min(
                Number(data.activeLayer) || 0,
                documentModel.getLayers().getLayerCount() - 1
            ));
            const activeLayer = documentModel.getLayers().getAt(activeLayerIndex);

            // Swap both references as one observable state change. Assigning the
            // layer before or after the document lets UI listeners briefly see a
            // layer that belongs to the other document.
            workspace.setDocumentAndActiveLayer(documentModel, activeLayer);
            this.app.fire("document:layers_changed", workspace);
            workspace.setFileInfo(fileName, fileHandle, filePath);
            workspace.getHistory().clearAll();
            workspace.setDirty(false);
            documentModel.invalidate();
            workspace.fitViewport();
            return workspace;
        } finally {
            if (activeToolType !== null && this.app.getActiveTool() === null) {
                this.app.setActiveToolFromType(activeToolType);
            }
        }
    }

    static getLocalFilePath(file) {
        if (file === null || file === undefined) {
            return null;
        }
        if (window.desktopFileActions !== undefined) {
            try {
                return window.desktopFileActions.getPathForFile(file) || null;
            } catch (_) {
                // Synthetic browser files do not have a local filesystem path.
            }
        }
        if (typeof file.path === "string" && file.path.length > 0) {
            return file.path;
        }
        return null;
    }

    static createLayerFromPdnData(workspace, saved, width, height) {
        const layer = Layer.createLayer(workspace, width, height, saved.name || "Layer");
        layer.properties.visible = saved.visible !== false;
        layer.properties.isBackground = !!saved.isBackground;
        layer.properties.opacity = saved.opacity === undefined ? 255 : saved.opacity;
        layer.properties.blendMode = LayerProperties.getBlendMode(saved.blendMode).value;
        layer.getSurface().context.drawImage(saved.canvas, 0, 0);
        return layer;
    }

    static async copySelection(copyMerged = false) {
        let workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || workspace.getActiveLayer() === null) {
            return false;
        }
        this.finishActiveTool();
        workspace = this.app.getActiveDocumentWorkspace();
        if (copyMerged) {
            workspace.updateComposition();
        }
        const layerSurface = copyMerged
            ? workspace.getCompositionSurface()
            : workspace.getActiveLayer().getSurface();
        let canvas;
        let clipboardBounds;
        if (workspace.getSelection().isEmpty()) {
            canvas = document.createElement("canvas");
            canvas.width = layerSurface.getWidth();
            canvas.height = layerSurface.getHeight();
            canvas.getContext("2d").drawImage(layerSurface.getCanvas(), 0, 0);
            clipboardBounds = new Rectangle(0, 0, canvas.width, canvas.height);
        } else {
            const path = workspace.getSelection().createPath();
            const masked = new MaskedSurface(layerSurface, path);
            path.dispose();
            if (masked.surface === null) {
                masked.dispose();
                return false;
            }
            canvas = document.createElement("canvas");
            canvas.width = masked.surface.getWidth();
            canvas.height = masked.surface.getHeight();
            canvas.getContext("2d").drawImage(masked.surface.getCanvas(), 0, 0);
            clipboardBounds = masked.bounds.clone();
            masked.dispose();
        }
        const blob = await this.canvasToBlob(canvas, "image/png");
        this.internalClipboard = blob;
        this.internalClipboardInfo = {
            width: canvas.width,
            height: canvas.height,
            bounds: clipboardBounds,
            pixelDigest: await this.getImagePixelDigest(canvas, canvas.width, canvas.height)
        };
        if (navigator.clipboard && typeof navigator.clipboard.write === "function" && typeof ClipboardItem !== "undefined") {
            try {
                await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
            } catch (_) {
                // The in-app clipboard still provides reliable copy/paste when browser permission is denied.
            }
        }
        return true;
    }

    static async cutSelection() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || workspace.getSelection().isEmpty()
            || !(workspace.getActiveLayer() instanceof BitmapLayer)) {
            return false;
        }
        if (!await this.copySelection(false)) {
            return false;
        }
        workspace.executeFunction(new EraseSelectionFunction());
        return true;
    }

    static async pasteFromClipboard() {
        const blob = await this.readClipboardImage();
        if (blob === null) {
            alert("The clipboard does not contain an image.");
            return false;
        }
        return this.pasteBlob(blob);
    }

    static async readClipboardImage() {
        let blob = null;
        if (navigator.clipboard && typeof navigator.clipboard.read === "function") {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    const type = item.types.find(candidate => candidate.startsWith("image/"));
                    if (type) {
                        blob = await item.getType(type);
                        break;
                    }
                }
            } catch (_) {
                // Fall back to the in-app clipboard below.
            }
        }
        if (blob === null) {
            blob = this.internalClipboard;
        }
        return blob;
    }

    static async pasteIntoNewImage() {
        const blob = await this.readClipboardImage();
        if (blob === null) {
            alert("The clipboard does not contain an image.");
            return false;
        }

        const image = await this.loadImage(blob);
        const workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
        const layer = workspace.getActiveLayer();
        layer.getSurface().clear();
        layer.getSurface().context.drawImage(image, 0, 0);
        layer.invalidate();
        workspace.setDirty(true);
        if (typeof image.close === "function") {
            image.close();
        }
        return true;
    }

    static async pasteIntoNewLayer() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            return this.pasteIntoNewImage();
        }

        const blob = await this.readClipboardImage();
        if (blob === null) {
            alert("The clipboard does not contain an image.");
            return false;
        }

        const image = await this.loadImage(blob);
        this.finishActiveTool(false);
        const documentModel = workspace.getDocument();
        const sourceBounds = await this.getClipboardSourceBounds(blob, image);
        const pastePosition = this.getPastePosition(
            workspace, sourceBounds, image.width, image.height);
        const layerIndex = workspace.getActiveLayerIndex() + 1;
        const layer = Layer.createLayer(
            workspace,
            documentModel.getWidth(),
            documentModel.getHeight(),
            i18n("addNewBlankLayer.layerName.format", documentModel.getLayers().size() + 1)
        );
        layer.getSurface().context.drawImage(image, pastePosition.x, pastePosition.y);

        const layerMemento = new NewLayerHistoryMemento(
            i18n("menu.edit.pasteInToNewLayer.text"),
            "assets/icons/menu_edit_paste_in_to_new_layer_icon.png",
            workspace,
            layerIndex
        );
        const selectionMemento = new SelectionHistoryMemento(
            i18n("menu.edit.pasteInToNewLayer.text"),
            "assets/icons/menu_edit_paste_in_to_new_layer_icon.png",
            workspace
        );
        documentModel.getLayers().insertLayerAt(layerIndex, layer);
        workspace.setActiveLayer(layer);

        const selection = workspace.getSelection();
        selection.push();
        selection.reset();
        selection.setContinuation(new Rectangle(
            pastePosition.x, pastePosition.y,
            Math.min(image.width, documentModel.getWidth() - pastePosition.x),
            Math.min(image.height, documentModel.getHeight() - pastePosition.y)
        ), CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();

        workspace.getHistory().pushNewMemento(new CompoundHistoryMemento(
            i18n("menu.edit.pasteInToNewLayer.text"),
            "assets/icons/menu_edit_paste_in_to_new_layer_icon.png",
            [layerMemento, selectionMemento]
        ));
        documentModel.invalidate();
        workspace.setDirty(true);
        this.app.setActiveToolFromType(ToolType.MOVE);
        if (typeof image.close === "function") {
            image.close();
        }
        return true;
    }

    static copySelectionOutline() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || workspace.getSelection().isEmpty()) {
            return false;
        }

        if (this.internalSelectionPath !== null) {
            this.internalSelectionPath.dispose();
        }
        this.internalSelectionPath = workspace.getSelection().createPath();
        this.app.fire("app:selection_clipboard_changed");
        return true;
    }

    static pasteSelectionOutline(combineMode = CombineMode.REPLACE) {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || this.internalSelectionPath === null) {
            return false;
        }

        const history = new SelectionHistoryMemento(
            i18n("menu.edit.pasteSelection.text"),
            "assets/icons/menu_edit_paste_selection_replace_icon.png",
            workspace
        );
        const selection = workspace.getSelection();
        selection.push();
        if (combineMode === CombineMode.REPLACE) {
            selection.reset();
        }
        selection.setContinuationPath(this.internalSelectionPath.clone(), combineMode);
        selection.commitContinuation();
        selection.pop();
        workspace.getHistory().pushNewMemento(history);
        return true;
    }

    static async pasteBlob(blob) {
        const image = await this.loadImage(blob);
        let workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
        }
        const documentModel = workspace.getDocument();
        let expand = false;
        if (image.width > documentModel.getWidth() || image.height > documentModel.getHeight()) {
            const preview = document.createElement("canvas");
            preview.className = "task-dialog-preview";
            const scale = Math.min(1, 150 / image.width, 120 / image.height);
            preview.width = Math.max(1, Math.round(image.width * scale));
            preview.height = Math.max(1, Math.round(image.height * scale));
            preview.getContext("2d").drawImage(image, 0, 0, preview.width, preview.height);
            const choice = await TaskDialog.show({
                title: "Paste",
                icon: "assets/icons/menu_edit_paste_icon.png",
                preview,
                message: "The image being pasted is larger than the canvas size. What do you want to do?",
                cancelValue: "cancel",
                choices: [
                    {
                        value: "expand",
                        title: "Expand canvas",
                        description: "Automatically expands the canvas to fit the image being pasted.",
                        icon: "assets/icons/menu_image_canvas_size_icon.png"
                    },
                    {
                        value: "keep",
                        title: "Keep canvas size",
                        description: "Does not expand the canvas. Move the pasted image to keep the part you want within the canvas boundaries.",
                        icon: "assets/icons/menu_edit_paste_icon.png"
                    },
                    {
                        value: "cancel",
                        title: "Cancel",
                        description: "Cancels the paste action.",
                        icon: "assets/icons/menu_edit_undo_icon.png"
                    }
                ]
            });
            if (choice === "cancel") {
                if (typeof image.close === "function") {
                    image.close();
                }
                return false;
            }
            expand = choice === "expand";
        }
        this.finishActiveTool(false);
        const preserveOverflow = !expand
            && (image.width > documentModel.getWidth() || image.height > documentModel.getHeight());
        let history;
        if (expand) {
            // The canvas resize and the pasted pixels are one operation. Capture the
            // complete pre-paste document so undo restores both its pixels and size.
            history = new DocumentStateHistoryMemento(
                "Paste",
                "assets/icons/menu_edit_paste_icon.png",
                workspace
            );
            this.resizeCanvas(
                workspace,
                Math.max(image.width, documentModel.getWidth()),
                Math.max(image.height, documentModel.getHeight()),
                false
            );
        }
        const sourceBounds = await this.getClipboardSourceBounds(blob, image);
        const pastePosition = this.getPastePosition(
            workspace, sourceBounds, image.width, image.height);
        const activeLayer = workspace.getActiveLayer();
        // Keep the pixels from before the paste separate from the floating
        // bitmap. MoveTool uses this underlay while the paste is still being
        // positioned, so transparent areas can never erase existing artwork.
        const pasteUnderlay = activeLayer.getSurface().clone();
        if (!expand) {
            history = new BitmapHistoryMemento(
                "Paste",
                "assets/icons/menu_edit_paste_icon.png",
                workspace,
                workspace.getActiveLayerIndex()
            );
        }
        activeLayer.getSurface().context.drawImage(image, pastePosition.x, pastePosition.y);
        workspace.getHistory().pushNewMemento(history);
        activeLayer.invalidate();
        const selection = workspace.getSelection();
        selection.push();
        selection.reset();
        selection.setContinuation(new Rectangle(
            pastePosition.x, pastePosition.y,
            preserveOverflow ? image.width : Math.min(image.width, workspace.getDocument().getWidth()),
            preserveOverflow ? image.height : Math.min(image.height, workspace.getDocument().getHeight())
        ), CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();
        this.app.setActiveToolFromType(ToolType.MOVE);
        const moveTool = this.app.getActiveTool();
        if (moveTool instanceof MoveTool) {
            moveTool.setPendingPaste(image, pasteUnderlay, pastePosition);
        }
        pasteUnderlay.dispose();
        workspace.setDirty(true);
        if (typeof image.close === "function") {
            image.close();
        }
        return true;
    }

    static async getClipboardSourceBounds(blob, image) {
        const info = this.internalClipboardInfo;
        if (info !== null
            && info.width === image.width
            && info.height === image.height) {
            // Chromium/Electron may decode and re-encode clipboard images. The
            // resulting PNG has different bytes (and often a different size),
            // even though its pixels are identical. Compare decoded pixels so
            // an in-app copy keeps its original document coordinates without
            // accidentally applying stale coordinates to an external image.
            if (blob === this.internalClipboard
                || info.pixelDigest === await this.getImagePixelDigest(
                    image, image.width, image.height)) {
                return info.bounds.clone();
            }
        }
        return new Rectangle(0, 0, image.width, image.height);
    }

    static async getImagePixelDigest(source, width, height) {
        let canvas;
        if (source instanceof HTMLCanvasElement
            && source.width === width && source.height === height) {
            canvas = source;
        } else {
            canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d", {willReadFrequently: true}).drawImage(source, 0, 0);
        }

        const pixels = canvas.getContext("2d", {willReadFrequently: true})
            .getImageData(0, 0, width, height).data;
        if (globalThis.crypto?.subtle !== undefined) {
            const digest = await globalThis.crypto.subtle.digest("SHA-256", pixels);
            return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        }

        // WebCrypto is available in supported browsers and Electron. Keep a
        // deterministic fallback for unusual embedded environments.
        let hash1 = 2166136261;
        let hash2 = 2246822519;
        for (let index = 0; index < pixels.length; index++) {
            hash1 = Math.imul(hash1 ^ pixels[index], 16777619);
            hash2 = Math.imul(hash2 ^ pixels[index], 3266489917);
        }
        return (hash1 >>> 0).toString(16).padStart(8, "0")
            + (hash2 >>> 0).toString(16).padStart(8, "0");
    }

    static getPastePosition(workspace, sourceBounds, width, height) {
        const visible = workspace.getVisibleDocumentRect();
        let visibleLeft = Math.ceil(visible.getLeft());
        let visibleTop = Math.ceil(visible.getTop());
        let visibleRight = Math.floor(visible.getRight());
        let visibleBottom = Math.floor(visible.getBottom());
        if (visibleRight <= visibleLeft) {
            visibleLeft = Math.floor(visible.getLeft());
            visibleRight = Math.ceil(visible.getRight());
        }
        if (visibleBottom <= visibleTop) {
            visibleTop = Math.floor(visible.getTop());
            visibleBottom = Math.ceil(visible.getBottom());
        }

        let x = Math.round(sourceBounds.getLeft());
        let y = Math.round(sourceBounds.getTop());
        if (x < visibleLeft) {
            x = visibleLeft;
        }
        else if (x + width > visibleRight) {
            x = visibleRight - width;
        }
        if (y < visibleTop) {
            y = visibleTop;
        }
        else if (y + height > visibleBottom) {
            y = visibleBottom - height;
        }

        x = Math.max(0, x);
        y = Math.max(0, y);
        const documentModel = workspace.getDocument();
        if (x + width > documentModel.getWidth()) {
            x -= Math.min(x + width - documentModel.getWidth(), x);
        }
        if (y + height > documentModel.getHeight()) {
            y -= Math.min(y + height - documentModel.getHeight(), y);
        }
        return new Point(x, y);
    }

    static finishActiveTool(reactivate = true) {
        const tool = this.app.getActiveTool();
        const workspace = this.app.getActiveDocumentWorkspace();
        if (tool === null || workspace === null || !tool.isActive()) {
            return null;
        }
        const type = tool.getType();
        this.app.setActiveTool(null);
        if (reactivate) {
            this.app.setActiveToolFromType(type);
        }
        return type;
    }

    static async resizeImage() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            return false;
        }
        const oldDocument = workspace.getDocument();
        const result = await ImageSizeDialog.open("resize", {
            width: oldDocument.getWidth(),
            height: oldDocument.getHeight(),
            resolution: this.getDocumentResolution(oldDocument),
            layerCount: oldDocument.getLayers().getLayerCount()
        });
        if (result === null
            || (result.width === oldDocument.getWidth()
                && result.height === oldDocument.getHeight()
                && result.resolution === this.getDocumentResolution(oldDocument))) {
            return false;
        }

        const activeToolType = this.finishActiveTool(false);
        const replacement = new Document(result.width, result.height, result.resolution);
        replacement.resolution = result.resolution;
        for (const oldLayer of oldDocument.getLayers().list()) {
            const layer = Layer.createLayer(workspace, result.width, result.height, oldLayer.properties.name);
            layer.properties = oldLayer.properties.clone();
            this.drawResizedImage(
                layer.getSurface().context,
                oldLayer.getSurface().getCanvas(),
                result.width,
                result.height,
                result.resampling,
                result.gammaCorrect
            );
            replacement.addLayer(layer);
        }

        return this.replaceDocument(
            workspace,
            replacement,
            workspace.getActiveLayerIndex(),
            i18n("menu.image.resize.text"),
            "assets/icons/menu_image_resize_icon.png",
            activeToolType
        );
    }

    static drawResizedImage(context, source, width, height, resampling, gammaCorrect) {
        const nearest = resampling === "nearestNeighbor";
        context.imageSmoothingEnabled = !nearest;
        context.imageSmoothingQuality = ["linearLowQuality"].includes(resampling)
            ? "low"
            : ["linear", "cubicSmooth"].includes(resampling) ? "medium" : "high";

        if (!gammaCorrect || nearest) {
            context.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height);
            return;
        }

        const linearCanvas = document.createElement("canvas");
        linearCanvas.width = source.width;
        linearCanvas.height = source.height;
        const linearContext = linearCanvas.getContext("2d", {willReadFrequently: true});
        linearContext.drawImage(source, 0, 0);
        const sourcePixels = linearContext.getImageData(0, 0, source.width, source.height);
        const toLinear = new Uint8Array(256);
        const toSrgb = new Uint8Array(256);
        for (let value = 0; value < 256; ++value) {
            const normalized = value / 255;
            toLinear[value] = Math.round(255 * (normalized <= 0.04045
                ? normalized / 12.92
                : Math.pow((normalized + 0.055) / 1.055, 2.4)));
            toSrgb[value] = Math.round(255 * (normalized <= 0.0031308
                ? normalized * 12.92
                : 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055));
        }
        for (let offset = 0; offset < sourcePixels.data.length; offset += 4) {
            sourcePixels.data[offset] = toLinear[sourcePixels.data[offset]];
            sourcePixels.data[offset + 1] = toLinear[sourcePixels.data[offset + 1]];
            sourcePixels.data[offset + 2] = toLinear[sourcePixels.data[offset + 2]];
        }
        linearContext.putImageData(sourcePixels, 0, 0);
        context.drawImage(linearCanvas, 0, 0, source.width, source.height, 0, 0, width, height);

        const resized = context.getImageData(0, 0, width, height);
        for (let offset = 0; offset < resized.data.length; offset += 4) {
            resized.data[offset] = toSrgb[resized.data[offset]];
            resized.data[offset + 1] = toSrgb[resized.data[offset + 1]];
            resized.data[offset + 2] = toSrgb[resized.data[offset + 2]];
        }
        context.putImageData(resized, 0, 0);
    }

    static async changeCanvasSize() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            return false;
        }
        const oldDocument = workspace.getDocument();
        const result = await ImageSizeDialog.open("canvas", {
            width: oldDocument.getWidth(),
            height: oldDocument.getHeight(),
            resolution: this.getDocumentResolution(oldDocument),
            layerCount: oldDocument.getLayers().getLayerCount()
        });
        if (result === null
            || (result.width === oldDocument.getWidth()
                && result.height === oldDocument.getHeight()
                && result.resolution === this.getDocumentResolution(oldDocument))) {
            return false;
        }

        const activeToolType = this.finishActiveTool(false);
        const replacement = new Document(result.width, result.height, result.resolution);
        replacement.resolution = result.resolution;
        const offset = this.getCanvasResizeOffset(
            oldDocument.getWidth(), oldDocument.getHeight(),
            result.width, result.height, result.anchor
        );
        const fillStyle = this.getCanvasFillStyle(result.fill);
        for (const oldLayer of oldDocument.getLayers().list()) {
            const layer = Layer.createLayer(workspace, result.width, result.height, oldLayer.properties.name);
            layer.properties = oldLayer.properties.clone();
            const context = layer.getSurface().context;
            if (fillStyle !== null) {
                context.fillStyle = fillStyle;
                context.fillRect(0, 0, result.width, result.height);
            }
            context.drawImage(oldLayer.getSurface().getCanvas(), offset.x, offset.y);
            replacement.addLayer(layer);
        }

        return this.replaceDocument(
            workspace,
            replacement,
            workspace.getActiveLayerIndex(),
            i18n("menu.image.canvasSize.text"),
            "assets/icons/menu_image_canvas_size_icon.png",
            activeToolType
        );
    }

    static getCanvasResizeOffset(oldWidth, oldHeight, newWidth, newHeight, anchor) {
        const deltaX = newWidth - oldWidth;
        const deltaY = newHeight - oldHeight;
        const horizontal = anchor.endsWith("Right") || anchor === "right"
            ? deltaX
            : anchor.endsWith("Left") || anchor === "left" ? 0 : Math.trunc(deltaX / 2);
        const vertical = anchor.startsWith("bottom")
            ? deltaY
            : anchor.startsWith("top") ? 0 : Math.trunc(deltaY / 2);
        return {x: horizontal, y: vertical};
    }

    static getCanvasFillStyle(fill) {
        if (fill === "transparent") {
            return null;
        }
        if (fill === "white") {
            return "#ffffffff";
        }
        if (fill === "black") {
            return "#000000ff";
        }
        const colors = FormRegistry.get("colorsForm");
        if (fill === "primary") {
            return colors?.mainColor?.toHex?.() || "#ff0000ff";
        }
        if (fill === "secondary") {
            return colors?.secondaryColor?.toHex?.() || "#ffffffff";
        }
        return null;
    }

    static getDocumentResolution(documentModel) {
        return Math.max(0.01, Number(documentModel.getResolution?.() ?? documentModel.resolution) || 96);
    }

    static resizeCanvas(workspace, width, height, clearHistory = true) {
        const oldDocument = workspace.getDocument();
        const activeIndex = workspace.getActiveLayerIndex();
        const activeTool = this.app.getActiveTool();
        const activeToolType = activeTool === null ? null : activeTool.getType();
        this.app.setActiveTool(null);
        const replacement = new Document(width, height, this.getDocumentResolution(oldDocument));
        workspace.setDocument(replacement);
        for (const oldLayer of oldDocument.getLayers().list()) {
            const layer = Layer.createLayer(workspace, width, height, oldLayer.properties.name);
            layer.properties = oldLayer.properties.clone();
            layer.getSurface().context.drawImage(oldLayer.getSurface().getCanvas(), 0, 0);
            replacement.addLayer(layer);
        }
        workspace.setActiveLayerIndex(Math.min(activeIndex, replacement.getLayers().getLayerCount() - 1));
        workspace.getSelection().reset();
        if (clearHistory) {
            workspace.getHistory().clearAll();
        }
        replacement.invalidate();
        workspace.fitViewport();
        this.app.fire("document:update_size", width, height);
        if (activeToolType !== null) {
            this.app.setActiveToolFromType(activeToolType);
        }
    }

    static cropToSelection() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || workspace.getSelection().isEmpty()) {
            return false;
        }

        const activeToolType = this.finishActiveTool(false);
        const oldDocument = workspace.getDocument();
        const selectionPath = workspace.getSelection().createPath();
        const pathBounds = selectionPath.getBounds();
        const cropBounds = Rectangle.intersect(Rectangle.absolute(
            Math.floor(pathBounds.getLeft()),
            Math.floor(pathBounds.getTop()),
            Math.ceil(pathBounds.getRight()),
            Math.ceil(pathBounds.getBottom())
        ), oldDocument.getBounds());
        if (cropBounds.isEmpty()) {
            selectionPath.dispose();
            return false;
        }

        const replacement = new Document(
            cropBounds.width,
            cropBounds.height,
            this.getDocumentResolution(oldDocument)
        );
        for (const oldLayer of oldDocument.getLayers().list()) {
            const layer = Layer.createLayer(
                workspace,
                cropBounds.width,
                cropBounds.height,
                oldLayer.properties.name
            );
            layer.properties = oldLayer.properties.clone();

            const context = layer.getSurface().context;
            context.save();
            context.translate(-cropBounds.x, -cropBounds.y);
            context.beginPath();
            for (const vertexList of selectionPath.getVertexLists()) {
                const vertices = vertexList.getVertices();
                if (vertices.length === 0) {
                    continue;
                }
                context.moveTo(vertices[0].x, vertices[0].y);
                for (let index = 1; index < vertices.length; ++index) {
                    context.lineTo(vertices[index].x, vertices[index].y);
                }
                context.closePath();
            }
            context.clip("evenodd");
            context.drawImage(oldLayer.getSurface().getCanvas(), 0, 0);
            context.restore();
            replacement.addLayer(layer);
        }
        selectionPath.dispose();

        return this.replaceDocument(
            workspace,
            replacement,
            workspace.getActiveLayerIndex(),
            i18n("menu.image.crop.text"),
            "assets/icons/menu_image_crop_icon.png",
            activeToolType
        );
    }

    static transformDocument(transformType) {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) {
            return false;
        }

        const activeToolType = this.finishActiveTool(false);
        const oldDocument = workspace.getDocument();
        const rotatesDimensions = transformType === "rotate90CW" || transformType === "rotate90CCW";
        const width = rotatesDimensions ? oldDocument.getHeight() : oldDocument.getWidth();
        const height = rotatesDimensions ? oldDocument.getWidth() : oldDocument.getHeight();
        const replacement = new Document(width, height, this.getDocumentResolution(oldDocument));

        for (const oldLayer of oldDocument.getLayers().list()) {
            const layer = Layer.createLayer(workspace, width, height, oldLayer.properties.name);
            layer.properties = oldLayer.properties.clone();
            this.drawTransformed(
                layer.getSurface().context,
                oldLayer.getSurface().getCanvas(),
                oldDocument.getWidth(),
                oldDocument.getHeight(),
                transformType
            );
            replacement.addLayer(layer);
        }

        const actionId = "menu.image." + transformType;
        return this.replaceDocument(
            workspace,
            replacement,
            workspace.getActiveLayerIndex(),
            i18n(actionId + ".text"),
            "assets/icons/" + actionId.replaceAll(".", "_")
                .replace(/([A-Z])/g, "_$1").toLowerCase() + "_icon.png",
            activeToolType
        );
    }

    static transformActiveLayer(transformType) {
        const workspace = this.app.getActiveDocumentWorkspace();
        const layer = workspace === null ? null : workspace.getActiveLayer();
        if (!(layer instanceof BitmapLayer)) {
            return false;
        }

        const activeToolType = this.finishActiveTool(false);
        const surface = layer.getSurface();
        const snapshot = surface.clone();
        const history = new BitmapHistoryMemento(
            i18n("menu.layers." + transformType + ".text"),
            "assets/icons/menu_layers_" + transformType
                .replace(/([A-Z])/g, "_$1").toLowerCase() + "_icon.png",
            workspace,
            workspace.getActiveLayerIndex()
        );
        surface.clear();
        this.drawTransformed(
            surface.context,
            snapshot.getCanvas(),
            surface.getWidth(),
            surface.getHeight(),
            transformType
        );
        snapshot.dispose();
        layer.invalidate();
        workspace.getHistory().pushNewMemento(history);
        workspace.setDirty(true);
        if (activeToolType !== null && this.app.getActiveTool() === null) {
            this.app.setActiveToolFromType(activeToolType);
        }
        return true;
    }

    static drawTransformed(context, source, width, height, transformType) {
        context.save();
        switch (transformType) {
            case "flipHorizontal":
                context.translate(width, 0);
                context.scale(-1, 1);
                break;
            case "flipVertical":
                context.translate(0, height);
                context.scale(1, -1);
                break;
            case "rotate90CW":
                context.translate(height, 0);
                context.rotate(Math.PI / 2);
                break;
            case "rotate90CCW":
                context.translate(0, width);
                context.rotate(-Math.PI / 2);
                break;
            case "rotate180":
                context.translate(width, height);
                context.rotate(Math.PI);
                break;
            default:
                context.restore();
                throw new Error("Unknown transform: " + transformType);
        }
        context.drawImage(source, 0, 0);
        context.restore();
    }

    static flattenDocument() {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || workspace.getDocument().getLayers().getLayerCount() < 2) {
            return false;
        }

        const activeToolType = this.finishActiveTool(false);
        workspace.updateComposition();
        const oldDocument = workspace.getDocument();
        const replacement = new Document(
            oldDocument.getWidth(),
            oldDocument.getHeight(),
            this.getDocumentResolution(oldDocument)
        );
        const layer = Layer.createBackgroundLayer(workspace, oldDocument.getWidth(), oldDocument.getHeight());
        layer.getSurface().clear();
        layer.getSurface().context.drawImage(workspace.getCompositionSurface().getCanvas(), 0, 0);
        replacement.addLayer(layer);

        return this.replaceDocument(
            workspace,
            replacement,
            0,
            i18n("menu.image.flatten.text"),
            "assets/icons/menu_image_flatten_icon.png",
            activeToolType
        );
    }

    static replaceDocument(
        workspace,
        replacement,
        activeLayerIndex,
        historyName,
        historyIcon,
        activeToolType = null
    ) {
        const memento = new DocumentStateHistoryMemento(historyName, historyIcon, workspace);
        workspace.setDocument(replacement);
        workspace.setActiveLayerIndex(Math.max(0, Math.min(
            activeLayerIndex,
            replacement.getLayers().getLayerCount() - 1
        )));
        workspace.getSelection().reset();
        replacement.invalidate();
        workspace.getHistory().pushNewMemento(memento);
        workspace.setDirty(true);

        this.app.updateCanvasBounds(false);
        this.app.fire("document:layers_changed", workspace);
        this.app.fire("document:update_size", replacement.getWidth(), replacement.getHeight());
        workspace.fitViewport();
        if (activeToolType !== null && this.app.getActiveTool() === null) {
            this.app.setActiveToolFromType(activeToolType);
        }
        return true;
    }

    static canvasToBlob(canvas, type, quality) {
        return ImageEncoder.canvasToBlob(canvas, type, quality);
    }

    static downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = name;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

DocumentIO.initialized = false;
DocumentIO.app = null;
DocumentIO.internalClipboard = null;
DocumentIO.internalClipboardInfo = null;
DocumentIO.internalSelectionPath = null;
DocumentIO.openedFileHandles = new WeakMap();
DocumentIO.webCloseDialogScheduled = false;
DocumentIO.webCloseDialogOpen = false;
DocumentIO.allowWebCloseUntil = 0;
