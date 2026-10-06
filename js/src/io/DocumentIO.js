class DocumentIO {

    static initialize(app) {
        if (this.initialized) return;
        this.initialized = true;
        this.app = app;

        window.addEventListener("beforeunload", event => {
            if (!app.hasUnsavedDocuments()) return;
            event.preventDefault();
            event.returnValue = "";
        });
        document.addEventListener("dragover", event => {
            if (event.dataTransfer !== null && Array.from(event.dataTransfer.types).includes("Files")) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            }
        });
        document.addEventListener("drop", event => {
            const files = event.dataTransfer === null ? [] : Array.from(event.dataTransfer.files || []);
            if (files.length === 0) return;
            event.preventDefault();
            this.handleDroppedFiles(files);
        });
        document.addEventListener("paste", event => {
            if (event.defaultPrevented || event.clipboardData === null) return;
            const image = Array.from(event.clipboardData.items || []).find(item => item.type.startsWith("image/"));
            if (image === undefined) return;
            const file = image.getAsFile();
            if (file !== null) {
                event.preventDefault();
                this.pasteBlob(file);
            }
        });
    }

    static async createNewDocument() {
        const active = this.app.getActiveDocumentWorkspace();
        const width = active === null ? 800 : active.getDocument().getWidth();
        const height = active === null ? 600 : active.getDocument().getHeight();
        const result = await NewFileDialog.open(width, height);
        if (result !== null) this.app.createBlankDocumentInNewWorkspace(result.width, result.height);
    }

    static openFilePicker() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp,image/gif,image/bmp,.pdn,application/json";
        input.multiple = true;
        input.onchange = () => this.openFiles(Array.from(input.files || []));
        input.click();
    }

    static async handleDroppedFiles(files) {
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
        if (choice === "open") await this.openFiles(files);
        if (choice === "layer") {
            for (const file of files) await this.addFileAsLayer(file);
        }
    }

    static async openFiles(files) {
        for (const file of files) {
            try {
                if (file.name.toLowerCase().endsWith(".pdn")) await this.openPdn(file);
                else await this.openImage(file);
            } catch (error) {
                alert("Could not open \"" + file.name + "\": " + error.message);
            }
        }
    }

    static async loadImage(blob) {
        if (typeof createImageBitmap === "function") return createImageBitmap(blob);
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

    static async openImage(file) {
        const image = await this.loadImage(file);
        const workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
        const layer = workspace.getActiveLayer();
        layer.getSurface().clear();
        layer.getSurface().context.drawImage(image, 0, 0);
        layer.properties.name = file.name.replace(/\.[^.]+$/, "") || i18n("layer.backgroundLayer.defaultName");
        workspace.setFileInfo(file.name);
        workspace.setDirty(false);
        workspace.getDocument().invalidate();
        workspace.fitViewport();
        if (typeof image.close === "function") image.close();
        return workspace;
    }

    static async addFileAsLayer(file) {
        if (file.name.toLowerCase().endsWith(".pdn")) {
            alert("A layered .pdn document must be opened as a document.");
            return;
        }
        const image = await this.loadImage(file);
        let workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
        this.finishActiveTool();
        const documentModel = workspace.getDocument();
        const layer = Layer.createLayer(workspace, documentModel.getWidth(), documentModel.getHeight(), file.name);
        layer.getSurface().context.drawImage(image, 0, 0);
        const index = workspace.getActiveLayer() === null
            ? documentModel.getLayers().getLayerCount()
            : workspace.getActiveLayerIndex() + 1;
        documentModel.getLayers().insertLayerAt(index, layer);
        workspace.setActiveLayer(layer);
        workspace.setDirty(true);
        documentModel.invalidate();
        if (typeof image.close === "function") image.close();
    }

    static async saveActive(saveAs = false) {
        const workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) return false;
        this.finishActiveTool();
        const layered = workspace.getDocument().getLayers().getLayerCount() > 1;
        const extension = layered ? ".pdn" : ".png";
        const baseName = (workspace.getFriendlyName() === i18n("untitled.friendlyName")
            ? "Untitled" : workspace.getFriendlyName().replace(/\.[^.]+$/, "")) + extension;

        let handle = !saveAs ? workspace.fileHandle : null;
        if (handle !== null) {
            const handleName = String(handle.name || "").toLowerCase();
            if ((layered && !handleName.endsWith(".pdn")) || (!layered && !handleName.endsWith(".png"))) {
                handle = null;
            }
        }
        if (handle === null && typeof window.showSaveFilePicker === "function") {
            try {
                handle = await window.showSaveFilePicker({
                    suggestedName: baseName,
                    types: layered ? [{
                        description: "paint.js layered document",
                        accept: {"application/x-paintdotjs": [".pdn"]}
                    }] : [{
                        description: "PNG image",
                        accept: {"image/png": [".png"]}
                    }]
                });
            } catch (error) {
                if (error.name === "AbortError") return false;
                throw error;
            }
        }

        const blob = layered ? await this.serializePdn(workspace) : await this.canvasToBlob(
            workspace.getCompositionSurface().getCanvas(), "image/png"
        );
        if (handle !== null) {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            workspace.setFileInfo(handle.name, handle);
        } else {
            this.downloadBlob(blob, baseName);
            workspace.setFileInfo(baseName);
        }
        workspace.setDirty(false);
        return true;
    }

    static async serializePdn(workspace) {
        const documentModel = workspace.getDocument();
        const data = {
            format: "paint.js.pdn/1",
            width: documentModel.getWidth(),
            height: documentModel.getHeight(),
            activeLayer: workspace.getActiveLayerIndex(),
            layers: documentModel.getLayers().list().map(layer => ({
                name: layer.properties.name,
                visible: layer.properties.visible,
                isBackground: layer.properties.isBackground,
                opacity: layer.properties.opacity,
                png: layer.getSurface().getCanvas().toDataURL("image/png")
            }))
        };
        return new Blob([JSON.stringify(data)], {type: "application/x-paintdotjs"});
    }

    static async openPdn(file) {
        let data;
        try {
            data = JSON.parse(await file.text());
        } catch (_) {
            throw new Error("This build currently opens layered .pdn files saved by paint.js. Native Paint.NET binary .pdn files are not supported yet.");
        }
        if (data.format !== "paint.js.pdn/1" || !Array.isArray(data.layers)) {
            throw new Error("Unsupported .pdn document format");
        }
        const workspace = this.app.createBlankDocumentInNewWorkspace(data.width, data.height);
        const documentModel = workspace.getDocument();
        documentModel.getLayers().removeLayerAt(0);
        for (const saved of data.layers) {
            const response = await fetch(saved.png);
            const image = await this.loadImage(await response.blob());
            const layer = Layer.createLayer(workspace, data.width, data.height, saved.name || "Layer");
            layer.properties.visible = saved.visible !== false;
            layer.properties.isBackground = !!saved.isBackground;
            layer.properties.opacity = saved.opacity === undefined ? 255 : saved.opacity;
            layer.getSurface().context.drawImage(image, 0, 0);
            documentModel.addLayer(layer);
            if (typeof image.close === "function") image.close();
        }
        if (documentModel.getLayers().getLayerCount() === 0) {
            documentModel.addLayer(Layer.createBackgroundLayer(workspace, data.width, data.height));
        }
        workspace.setActiveLayerIndex(Math.max(0, Math.min(
            Number(data.activeLayer) || 0,
            documentModel.getLayers().getLayerCount() - 1
        )));
        workspace.setFileInfo(file.name);
        workspace.getHistory().clearAll();
        workspace.setDirty(false);
        documentModel.invalidate();
        workspace.fitViewport();
        return workspace;
    }

    static async copySelection() {
        let workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null || workspace.getActiveLayer() === null) return false;
        this.finishActiveTool();
        workspace = this.app.getActiveDocumentWorkspace();
        const layerSurface = workspace.getActiveLayer().getSurface();
        let canvas;
        if (workspace.getSelection().isEmpty()) {
            canvas = document.createElement("canvas");
            canvas.width = layerSurface.getWidth();
            canvas.height = layerSurface.getHeight();
            canvas.getContext("2d").drawImage(layerSurface.getCanvas(), 0, 0);
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
            masked.dispose();
        }
        const blob = await this.canvasToBlob(canvas, "image/png");
        this.internalClipboard = blob;
        if (navigator.clipboard && typeof navigator.clipboard.write === "function" && typeof ClipboardItem !== "undefined") {
            try {
                await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
            } catch (_) {
                // The in-app clipboard still provides reliable copy/paste when browser permission is denied.
            }
        }
        return true;
    }

    static async pasteFromClipboard() {
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
        if (blob === null) blob = this.internalClipboard;
        if (blob === null) {
            alert("The clipboard does not contain an image.");
            return false;
        }
        return this.pasteBlob(blob);
    }

    static async pasteBlob(blob) {
        const image = await this.loadImage(blob);
        let workspace = this.app.getActiveDocumentWorkspace();
        if (workspace === null) workspace = this.app.createBlankDocumentInNewWorkspace(image.width, image.height);
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
                if (typeof image.close === "function") image.close();
                return false;
            }
            expand = choice === "expand";
        }
        this.finishActiveTool(false);
        if (expand) {
            this.resizeCanvas(workspace, Math.max(image.width, documentModel.getWidth()), Math.max(image.height, documentModel.getHeight()));
        }
        const activeLayer = workspace.getActiveLayer();
        const history = new BitmapHistoryMemento(
            "Paste",
            "assets/icons/menu_edit_paste_icon.png",
            workspace,
            workspace.getActiveLayerIndex()
        );
        activeLayer.getSurface().context.drawImage(image, 0, 0);
        workspace.getHistory().pushNewMemento(history);
        activeLayer.invalidate();
        const selection = workspace.getSelection();
        selection.push();
        selection.reset();
        selection.setContinuation(new Rectangle(
            0, 0,
            Math.min(image.width, workspace.getDocument().getWidth()),
            Math.min(image.height, workspace.getDocument().getHeight())
        ), CombineMode.REPLACE);
        selection.commitContinuation();
        selection.pop();
        this.app.setActiveToolFromType(ToolType.MOVE);
        workspace.setDirty(true);
        if (typeof image.close === "function") image.close();
        return true;
    }

    static finishActiveTool(reactivate = true) {
        const tool = this.app.getActiveTool();
        const workspace = this.app.getActiveDocumentWorkspace();
        if (tool === null || workspace === null || !tool.isActive()) return null;
        const type = tool.getType();
        this.app.setActiveTool(null);
        if (reactivate) this.app.setActiveToolFromType(type);
        return type;
    }

    static resizeCanvas(workspace, width, height) {
        const oldDocument = workspace.getDocument();
        const activeIndex = workspace.getActiveLayerIndex();
        const activeTool = this.app.getActiveTool();
        const activeToolType = activeTool === null ? null : activeTool.getType();
        this.app.setActiveTool(null);
        const replacement = new Document(width, height);
        workspace.setDocument(replacement);
        for (const oldLayer of oldDocument.getLayers().list()) {
            const layer = Layer.createLayer(workspace, width, height, oldLayer.properties.name);
            layer.properties = oldLayer.properties.clone();
            layer.getSurface().context.drawImage(oldLayer.getSurface().getCanvas(), 0, 0);
            replacement.addLayer(layer);
        }
        workspace.setActiveLayerIndex(Math.min(activeIndex, replacement.getLayers().getLayerCount() - 1));
        workspace.getSelection().reset();
        workspace.getHistory().clearAll();
        replacement.invalidate();
        workspace.fitViewport();
        this.app.fire("document:update_size", width, height);
        if (activeToolType !== null) this.app.setActiveToolFromType(activeToolType);
    }

    static canvasToBlob(canvas, type) {
        return new Promise((resolve, reject) => canvas.toBlob(blob => {
            if (blob === null) reject(new Error("Could not encode the image"));
            else resolve(blob);
        }, type));
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
