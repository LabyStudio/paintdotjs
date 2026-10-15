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

class PluginFileTypes {

    static definitions = new Map();
    static maximumPixels = 64 * 1024 * 1024;
    static maximumBytes = 256 * 1024 * 1024;
    static reservedExtensions = new Set([
        ".pdn", ".png", ".jpg", ".jpeg", ".jpe", ".jxl", ".avif", ".heic", ".heif", ".webp",
        ".dds", ".tif", ".tiff", ".gif", ".bmp", ".tga", ".jxr", ".wdp", ".wmp",
        ".js", ".paintjs", ".dll", ".zip", ".ttf", ".otf", ".woff", ".woff2"
    ]);

    static normalize(plugin, type) {
        if (!type || typeof type !== "object") {
            throw new Error("Invalid file-type definition.");
        }
        let localId = PluginManager.validateId(type.id, "File-type id");
        if (typeof type.decode !== "function" && typeof type.encode !== "function") {
            throw new Error(`File type ${localId} must define decode() and/or encode().`);
        }
        if (!Array.isArray(type.extensions) || !type.extensions.length || type.extensions.length > 16) {
            throw new Error(`File type ${localId} must declare extensions.`);
        }
        let extensions = type.extensions.map(value => String(value).toLowerCase());
        if (new Set(extensions).size !== extensions.length || extensions.some(extension =>
            !/^\.[a-z0-9]{1,12}$/.test(extension) || this.reservedExtensions.has(extension))) {
            throw new Error(`File type ${localId} has duplicate, invalid, or reserved extensions.`);
        }
        let mime = type.mime || "application/octet-stream";
        if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(mime)) {
            throw new Error(`File type ${localId} has an invalid MIME type.`);
        }
        return {
            id: `plugin.${plugin.id}.${localId}`, pluginId: plugin.id,
            name: PluginManager.validateText(type.name, "File-type name", 80),
            extensions, extension: extensions[0], mime,
            supportsLayers: type.supportsLayers === true,
            controls: PluginManager.normalizeControls(type.saveControls || [], localId),
            decode: type.decode, encode: type.encode
        };
    }

    static assertAvailable(plugin) {
        let claimed = new Set();
        for (let type of this.definitions.values()) {
            if (type.pluginId !== plugin.id) {
                type.extensions.forEach(extension => claimed.add(extension));
            }
        }
        for (let type of plugin.fileTypes) {
            for (let extension of type.extensions) {
                if (claimed.has(extension)) {
                    throw new Error(`Another file type already handles ${extension}. Disable it first.`);
                }
                claimed.add(extension);
            }
        }
    }

    static forFile(file) {
        let name = String(file?.name || "").toLowerCase();
        return Array.from(this.definitions.values()).find(type => typeof type.decode === "function"
            && type.extensions.some(extension => name.endsWith(extension))) || null;
    }

    static saveFormats() {
        return Array.from(this.definitions.values()).filter(type => typeof type.encode === "function");
    }

    static openExtensions() {
        return Array.from(this.definitions.values()).filter(type => typeof type.decode === "function")
            .flatMap(type => type.extensions);
    }

    static normalizeDocument(value) {
        let width = value?.width, height = value?.height;
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
            || width > 32768 || height > 32768 || width * height > this.maximumPixels) {
            throw new Error("The plugin returned an invalid or oversized document.");
        }
        let layers = value.layers || [{name: "Background", data: value.data}];
        if (!Array.isArray(layers) || !layers.length || layers.length > 64
            || layers.length * width * height > this.maximumPixels) {
            throw new Error("The plugin document has too many layers or pixels.");
        }
        let resolution = value.resolution ?? 96;
        let activeLayer = value.activeLayer ?? layers.length - 1;
        if (!Number.isFinite(resolution) || resolution <= 0 || !Number.isInteger(activeLayer)
            || activeLayer < 0 || activeLayer >= layers.length) {
            throw new Error("The plugin returned invalid document properties.");
        }
        return {width, height, resolution, activeLayer, layers: layers.map(layer => {
            if (!(layer?.data instanceof Uint8Array || layer?.data instanceof Uint8ClampedArray)
                || layer.data.length !== width * height * 4) {
                throw new Error("Each plugin layer must supply a full-size RGBA byte buffer.");
            }
            let opacity = layer.opacity ?? 255;
            if (!Number.isInteger(opacity) || opacity < 0 || opacity > 255) {
                throw new Error("Invalid plugin layer opacity.");
            }
            let blendMode = layer.blendMode || "normal";
            if (LayerProperties.getBlendMode(blendMode).value !== blendMode) {
                throw new Error(`Unsupported plugin layer blend mode: ${blendMode}`);
            }
            return {name: PluginManager.optionalText(layer.name, "Layer", 160), isBackground: layer.isBackground === true,
                visible: layer.visible !== false, opacity, blendMode,
                data: new Uint8ClampedArray(layer.data)};
        })};
    }

    static async decode(file, type = this.forFile(file)) {
        if (!type || typeof type.decode !== "function") {
            throw new Error("No enabled plugin can read this file type.");
        }
        if (file.size > this.maximumBytes) {
            throw new Error("Plugin input files may not exceed 256 MB.");
        }
        let result = await type.decode({bytes: new Uint8Array(await file.arrayBuffer()), fileName: file.name || ""});
        let data = this.normalizeDocument(result);
        if (!type.supportsLayers && data.layers.length > 1) {
            throw new Error("This file type did not declare layer support.");
        }
        return data;
    }

    static async encode(id, documentData, values = {}) {
        let type = this.definitions.get(id);
        if (!type || typeof type.encode !== "function") {
            throw new Error("The file-type plugin is disabled or no longer installed.");
        }
        let data = this.normalizeDocument(documentData);
        if (!type.supportsLayers && data.layers.length > 1) {
            throw new Error("This file type requires a flattened image.");
        }
        let defaults = Object.fromEntries(type.controls.map(control => [control.key, control.defaultValue]));
        let result = await type.encode({document: data, values: {...defaults, ...values}});
        if (!(result instanceof Blob || result instanceof Uint8Array || result instanceof Uint8ClampedArray || result instanceof ArrayBuffer)) {
            throw new Error("File-type encode() must return a Blob, byte array, or ArrayBuffer.");
        }
        let blob = new Blob([result], {type: type.mime});
        if (!blob.size || blob.size > this.maximumBytes) {
            throw new Error("The plugin returned empty or oversized file data.");
        }
        return blob;
    }

    static toCanvas(layer, width, height) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").putImageData(new ImageData(layer.data, width, height), 0, 0);
        return canvas;
    }

    static toWorkspaceData(data) {
        return {...data, layers: data.layers.map(layer => ({...layer,
            canvas: this.toCanvas(layer, data.width, data.height)}))};
    }

    static snapshot(workspace, preserveLayers) {
        let model = workspace.getDocument(), width = model.getWidth(), height = model.getHeight();
        if (width * height * (preserveLayers ? model.getLayers().getLayerCount() : 1) > this.maximumPixels) {
            throw new Error("The document exceeds the plugin pixel limit.");
        }
        let layers = [];
        if (preserveLayers) {
            for (let i = 0; i < model.getLayers().getLayerCount(); ++i) {
                let layer = model.getLayers().getAt(i);
                layers.push({...layer.properties,
                    data: layer.getSurface().context.getImageData(0, 0, width, height).data});
            }
        } else {
            workspace.updateComposition();
            layers.push({name: "Background", data: workspace.getCompositionSurface().getCanvas()
                .getContext("2d").getImageData(0, 0, width, height).data});
        }
        return {width, height, resolution: DocumentIO.getDocumentResolution(model),
            activeLayer: preserveLayers ? Math.max(0, workspace.getActiveLayerIndex()) : 0, layers};
    }
}
