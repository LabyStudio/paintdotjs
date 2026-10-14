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

class AssetPackManager {

    static databaseName = "paintdotjs-asset-packs";
    static storeName = "packs";
    static activePackKey = "paintdotjs.assetPack.active.v1";
    static activeTranslationsKey = "paintdotjs.assetPack.translations.v1";
    static activeLocalesKey = "paintdotjs.assetPack.locales.v1";
    static defaultPack = {
        id: "default",
        name: "paint.js Default",
        author: "LabyStudio",
        version: "1.0.0",
        description: "Original paint.js interface artwork and built-in English text.",
        builtIn: true,
        iconCount: 276,
        localeCount: 1
    };
    static database = null;
    static packs = [];
    static activePack = null;
    static objectUrls = new Map();
    static observer = null;
    static initialization = null;
    static previewPaths = [
        "assets/icons/paint_brush_tool_icon.png",
        "assets/icons/paint_bucket_icon.png",
        "assets/icons/pencil_tool_icon.png",
        "assets/icons/eraser_tool_icon.png",
        "assets/icons/shapes_tool_icon.png",
        "assets/icons/color_picker_tool_icon.png"
    ];

    static initialize() {
        if (this.initialization === null) {
            this.initialization = this.loadPacks();
        }
        return this.initialization;
    }

    static async loadPacks() {
        try {
            this.database = await this.openDatabase();
            this.packs = await this.readAllPacks();
            const activeId = localStorage.getItem(this.activePackKey) || "default";
            const active = this.packs.find(pack => pack.id === activeId) || null;
            await this.applyPack(active);
        } catch (error) {
            console.warn("Could not initialize icon packs", error);
            await this.applyPack(null);
        }
        this.observeImages();
        window.dispatchEvent(new CustomEvent("paintdotjs:asset-packs-changed"));
    }

    static getPacks() {
        return [this.defaultPack, ...this.packs.map(pack => this.publicMetadata(pack))];
    }

    static getActivePackId() {
        return this.activePack?.id || "default";
    }

    static getPreviewFiles(id, limit = 6) {
        if (id === "default") {
            return this.previewPaths.slice(0, limit).map(path => ({
                path,
                type: null,
                data: null
            }));
        }
        let pack = this.packs.find(candidate => candidate.id === id);
        if (pack === undefined) {
            return [];
        }
        let filesByPath = new Map(pack.files.map(file => [file.path, file]));
        let previewFiles = [];
        for (let path of this.previewPaths) {
            let file = filesByPath.get(path);
            if (file !== undefined) {
                previewFiles.push(file);
                filesByPath.delete(path);
            }
        }
        let remaining = [...filesByPath.values()].sort((left, right) => {
            let leftIsIcon = left.path.startsWith("assets/icons/") ? 0 : 1;
            let rightIsIcon = right.path.startsWith("assets/icons/") ? 0 : 1;
            return leftIsIcon - rightIsIcon || left.path.localeCompare(right.path);
        });
        previewFiles.push(...remaining);
        return previewFiles.slice(0, limit);
    }

    static isZipFile(file) {
        return file !== null && file !== undefined
            && (String(file.name || "").toLowerCase().endsWith(".zip")
                || file.type === "application/zip" || file.type === "application/x-zip-compressed");
    }

    static async importFile(file) {
        await this.initialize();
        if (!this.isZipFile(file)) {
            throw new Error("Choose a ZIP icon pack.");
        }
        if (file.size > 25 * 1024 * 1024) {
            throw new Error("Icon packs may not exceed 25 MB.");
        }
        if (window.ZipArchive === undefined) {
            throw new Error("ZIP support is unavailable in this build.");
        }

        let entryCount = 0;
        let declaredSize = 0;
        const archive = window.ZipArchive.unzipSync(new Uint8Array(await file.arrayBuffer()), {
            filter: entry => {
                ++entryCount;
                declaredSize += entry.originalSize;
                if (entryCount > 1000) {
                    throw new Error("Icon packs may contain at most 1,000 files.");
                }
                if (declaredSize > 60 * 1024 * 1024) {
                    throw new Error("The extracted icon pack may not exceed 60 MB.");
                }
                return true;
            }
        });
        const names = Object.keys(archive).filter(name => !name.endsWith("/"));
        const manifestEntry = names.find(name => name === "asset-pack.json")
            || names.find(name => name.endsWith("/asset-pack.json"));
        if (manifestEntry === undefined) {
            throw new Error("The ZIP does not contain asset-pack.json.");
        }
        const prefix = manifestEntry.slice(0, -"asset-pack.json".length);
        const manifest = this.parseJson(archive[manifestEntry], "asset-pack.json");
        this.validateManifest(manifest);

        const files = [];
        const translations = {};
        let extractedSize = 0;
        let iconCount = 0;
        for (const archiveName of names) {
            if (!archiveName.startsWith(prefix) || archiveName === manifestEntry) {
                continue;
            }
            const relative = this.normalizePath(archiveName.slice(prefix.length));
            if (relative === null) {
                throw new Error(`Invalid path in icon pack: ${archiveName}`);
            }
            const data = archive[archiveName];
            extractedSize += data.byteLength;
            if (extractedSize > 60 * 1024 * 1024) {
                throw new Error("The extracted icon pack may not exceed 60 MB.");
            }
            if (/^(icons|images|cursors)\/.+\.(png|webp)$/i.test(relative)) {
                files.push({
                    path: "assets/" + relative,
                    type: relative.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png",
                    data
                });
                ++iconCount;
            } else {
                const language = /^lang\/([A-Za-z0-9-]+)\.json$/.exec(relative);
                if (language !== null) {
                    const dictionary = this.parseJson(data, relative);
                    if (dictionary === null || typeof dictionary !== "object" || Array.isArray(dictionary)) {
                        throw new Error(`${relative} must contain a JSON object.`);
                    }
                    translations[language[1]] = dictionary;
                }
            }
        }
        if (iconCount === 0 && Object.keys(translations).length === 0) {
            throw new Error("The icon pack does not contain supported images or translations.");
        }

        const idBase = String(manifest.id || manifest.name).toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "asset-pack";
        const id = `${idBase}-${crypto.randomUUID()}`;
        const record = {
            id,
            name: String(manifest.name).trim(),
            author: String(manifest.author || "Unknown").trim(),
            version: String(manifest.version || "1.0.0").trim(),
            description: String(manifest.description || "").trim(),
            importedAt: new Date().toISOString(),
            iconCount,
            localeCount: Object.keys(translations).length,
            files,
            translations
        };
        await this.writePack(record);
        this.packs.push(record);
        await this.activate(record.id);
        return this.publicMetadata(record);
    }

    static async activate(id) {
        await this.initialize();
        const pack = id === "default" ? null : this.packs.find(candidate => candidate.id === id);
        if (id !== "default" && pack === undefined) {
            throw new Error("The selected icon pack is not installed.");
        }
        await this.applyPack(pack || null);
        let languageCodes = ["en", ...Object.keys(pack?.translations || {})];
        this.normalizeLanguagePreference(languageCodes);
        try {
            localStorage.setItem(this.activePackKey, id);
            if (pack === null || Object.keys(pack.translations).length === 0) {
                localStorage.removeItem(this.activeTranslationsKey);
                localStorage.removeItem(this.activeLocalesKey);
            } else {
                localStorage.removeItem(this.activeTranslationsKey);
                localStorage.setItem(this.activeLocalesKey, JSON.stringify(Object.keys(pack.translations)));
                this.prepareLanguage(this.getLanguagePreference());
            }
        } catch (error) {
            console.warn("Could not save the active icon pack", error);
        }
        window.dispatchEvent(new CustomEvent("paintdotjs:asset-pack-changed", {
            detail: {id, requiresReload: true}
        }));
    }

    static normalizeLanguagePreference(codes) {
        if (typeof AppSettingsStore !== "undefined") {
            let preference = AppSettingsStore.get("ui.language", "auto");
            if (preference !== "auto") {
                let normalized = String(preference).replace("_", "-");
                let selected = codes.find(code => code.toLowerCase() === normalized.toLowerCase())
                    || codes.find(code => code.split("-")[0].toLowerCase()
                        === normalized.split("-")[0].toLowerCase())
                    || "en";
                if (preference !== selected) {
                    AppSettingsStore.set("ui.language", selected);
                    if (window.Language !== undefined && Language.code === selected) {
                        Language.preference = selected;
                    }
                }
            }
        }
    }

    static getLanguagePreference() {
        try {
            return JSON.parse(localStorage.getItem("paintdotjs.settings.v1") || "{}").ui?.language || "auto";
        } catch (error) {
            console.warn("Could not read the language preference", error);
            return "auto";
        }
    }

    static prepareLanguage(preference) {
        const translations = this.activePack?.translations || {};
        const codes = Object.keys(translations);
        const requested = preference === "auto" ? navigator.language : preference;
        const normalized = String(requested || "").replace("_", "-");
        const selected = codes.find(code => code.toLowerCase() === normalized.toLowerCase())
            || codes.find(code => code.split("-")[0].toLowerCase()
                === normalized.split("-")[0].toLowerCase())
            || null;
        const stored = {};
        if (translations.en !== undefined) {
            stored.en = translations.en;
        }
        if (selected !== null) {
            stored[selected] = translations[selected];
        }
        try {
            if (Object.keys(stored).length === 0) {
                localStorage.removeItem(this.activeTranslationsKey);
            } else {
                localStorage.setItem(this.activeTranslationsKey, JSON.stringify(stored));
            }
        } catch (error) {
            console.warn("Could not prepare the selected asset-pack language", error);
        }
    }

    static async remove(id) {
        await this.initialize();
        const index = this.packs.findIndex(pack => pack.id === id);
        if (index < 0) {
            return false;
        }
        if (this.getActivePackId() === id) {
            await this.activate("default");
        }
        await this.deletePack(id);
        this.packs.splice(index, 1);
        window.dispatchEvent(new CustomEvent("paintdotjs:asset-packs-changed"));
        return true;
    }

    static resolve(path) {
        const normalized = String(path || "").replace(/^\.\//, "");
        return this.objectUrls.get(normalized) || path;
    }

    static async applyPack(pack) {
        for (const url of this.objectUrls.values()) {
            URL.revokeObjectURL(url);
        }
        this.objectUrls.clear();
        this.activePack = pack;
        if (window.Language !== undefined && typeof Language.setPackLocales === "function") {
            Language.setPackLocales(pack === null ? [] : Object.keys(pack.translations));
        }
        if (pack !== null) {
            for (const file of pack.files) {
                const blob = new Blob([file.data], {type: file.type});
                this.objectUrls.set(file.path, URL.createObjectURL(blob));
            }
        }
        if (document.documentElement !== null) {
            this.applyToTree(document.documentElement);
        }
    }

    static observeImages() {
        if (this.observer !== null || document.documentElement === null) {
            return;
        }
        this.observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.type === "attributes" && record.target instanceof HTMLImageElement) {
                    this.applyToImage(record.target);
                }
                for (const node of record.addedNodes) {
                    if (node instanceof Element) {
                        this.applyToTree(node);
                    }
                }
            }
        });
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src"]
        });
        this.applyToTree(document.documentElement);
    }

    static applyToTree(root) {
        if (root instanceof HTMLImageElement) {
            this.applyToImage(root);
        }
        for (const image of root.querySelectorAll?.("img") || []) {
            this.applyToImage(image);
        }
    }

    static applyToImage(image) {
        if (image.dataset.assetPackUpdating === "true") {
            return;
        }
        let original = image.dataset.assetPath || image.getAttribute("src") || "";
        if (original.startsWith("blob:")) {
            return;
        }
        original = original.replace(/^\.\//, "");
        if (!original.startsWith("assets/")) {
            return;
        }
        image.dataset.assetPath = original;
        image.dataset.assetPackSource = this.objectUrls.has(original) ? "installed" : "built-in";
        const resolved = this.resolve(original);
        if (image.getAttribute("src") !== resolved) {
            image.dataset.assetPackUpdating = "true";
            image.setAttribute("src", resolved);
            delete image.dataset.assetPackUpdating;
        }
    }

    static normalizePath(path) {
        const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
        const segments = normalized.split("/");
        if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)
            || segments.includes("..") || normalized.includes("\0")) {
            return null;
        }
        return normalized;
    }

    static parseJson(bytes, name) {
        try {
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch (error) {
            throw new Error(`${name} is not valid JSON: ${error.message}`);
        }
    }

    static validateManifest(manifest) {
        if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
            throw new Error("asset-pack.json must contain a JSON object.");
        }
        if (manifest.formatVersion !== 1) {
            throw new Error("Only asset-pack formatVersion 1 is supported.");
        }
        if (typeof manifest.name !== "string" || !manifest.name.trim() || manifest.name.length > 80) {
            throw new Error("asset-pack.json must provide a name of at most 80 characters.");
        }
        for (const field of ["author", "version", "description", "id"]) {
            if (manifest[field] !== undefined && typeof manifest[field] !== "string") {
                throw new Error(`asset-pack.json field ${field} must be a string.`);
            }
        }
    }

    static publicMetadata(pack) {
        return {
            id: pack.id,
            name: pack.name,
            author: pack.author,
            version: pack.version,
            description: pack.description,
            importedAt: pack.importedAt,
            iconCount: pack.iconCount,
            localeCount: pack.localeCount,
            builtIn: false
        };
    }

    static openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName, {keyPath: "id"});
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not open asset-pack storage."));
            request.onblocked = () => reject(new Error("Asset-pack storage is blocked by another window."));
        });
    }

    static readAllPacks() {
        return new Promise((resolve, reject) => {
            const request = this.database.transaction(this.storeName, "readonly")
                .objectStore(this.storeName).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error || new Error("Could not read icon packs."));
        });
    }

    static writePack(pack) {
        return this.runRequest("readwrite", store => store.put(pack));
    }

    static deletePack(id) {
        return this.runRequest("readwrite", store => store.delete(id));
    }

    static runRequest(mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(this.storeName, mode);
            const request = callback(transaction.objectStore(this.storeName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Asset-pack storage operation failed."));
            transaction.onabort = () => reject(transaction.error || new Error("Asset-pack storage transaction failed."));
        });
    }
}
