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

class FontManager {

    static databaseName = "paintdotjs-user-fonts";
    static databaseVersion = 1;
    static storeName = "fonts";
    static records = [];
    static faces = new Map();
    static loadingFaces = new Map();
    static faceLoadQueue = Promise.resolve();
    static initialization = null;
    static metadataReady = false;
    static metadataCacheKey = "paintdotjs-user-font-metadata-v1";

    static initialize() {
        if (this.initialization === null) {
            this.initialization = this.loadStoredFonts().catch(error => {
                console.error("Could not load user fonts", error);
            }).finally(() => {
                this.metadataReady = true;
            });
        }
        return this.initialization;
    }

    static isFontFile(file) {
        if (file === null || file === undefined) {
            return false;
        }
        const extension = String(file.name || "").toLowerCase().split(".").pop();
        return ["ttf", "otf", "woff", "woff2"].includes(extension)
            || /^font\//i.test(String(file.type || ""));
    }

    static getAcceptedFileTypes() {
        return ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";
    }

    static getFonts() {
        return [...this.records].sort((left, right) =>
            left.name.localeCompare(right.name, undefined, {sensitivity: "base"}));
    }

    static getTextToolChoices() {
        const builtIn = [
            ["Calibri", "Calibri"], ["Segoe UI", "Segoe UI"], ["Arial", "Arial"],
            ["serif", "Serif"], ["monospace", "Monospace"]
        ];
        return [...builtIn, ...this.getFonts().map(font => [font.family, font.name])];
    }

    static async importFiles(files, onProgress = null) {
        await this.initialize();
        const added = [];
        const errors = [];
        const fontFiles = Array.from(files || []).filter(file => this.isFontFile(file));
        let completed = 0;
        const report = (file, phase) => {
            if (typeof onProgress === "function") {
                onProgress({completed, total: fontFiles.length, file, phase});
            }
        };

        report(null, "preparing");
        await this.yieldToBrowser();
        for (const file of fontFiles) {
            report(file, "adding");
            try {
                added.push(await this.addFont(file, false));
            } catch (error) {
                errors.push({file, error});
            }
            ++completed;
            report(file, "complete");
            // FontFace parsing can occupy the main thread. Let progress paint
            // and input events run before beginning the next font in a batch.
            await this.yieldToBrowser();
        }
        // One event is enough for a batch. Rebuilding the Text toolbar after
        // every file made large imports repeatedly destroy an open picker.
        if (added.length > 0) {
            this.notifyChanged();
        }
        return {added, errors};
    }

    static async addFont(file, notify = true) {
        if (!this.isFontFile(file)) {
            throw new Error("Unsupported font format");
        }
        const data = await file.arrayBuffer();
        if (data.byteLength === 0) {
            throw new Error("The font file is empty");
        }

        const id = typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2);
        const baseName = String(file.name || "Custom Font").replace(/\.[^.]+$/, "");
        const name = baseName.trim() || "Custom Font";
        const safeName = name.replace(/[\\'";,]/g, " ").replace(/\s+/g, " ").trim();
        const family = `paintjs-${safeName || "font"}-${id}`;
        const record = {
            id,
            name,
            family,
            fileName: String(file.name || name),
            type: String(file.type || ""),
            size: data.byteLength,
            addedAt: Date.now(),
            data
        };

        // Validate and load before persisting so corrupt files never appear in
        // Settings after the browser rejects them.
        const face = await this.createFace(record);
        try {
            const database = await this.openDatabase();
            await this.runRequest(database, "readwrite", store => store.put(record));
        } catch (error) {
            document.fonts.delete(face);
            throw error;
        }
        this.records.push(this.toMetadata(record));
        this.faces.set(id, face);
        this.writeMetadataCache();
        if (notify) {
            this.notifyChanged();
        }
        return this.toMetadata(record);
    }

    static async removeFont(id) {
        await this.initialize();
        const record = this.records.find(font => font.id === id);
        if (record === undefined) {
            return false;
        }
        const database = await this.openDatabase();
        await this.runRequest(database, "readwrite", store => store.delete(id));
        const face = this.faces.get(id);
        if (face !== undefined) {
            document.fonts.delete(face);
        }
        this.faces.delete(id);
        this.records = this.records.filter(font => font.id !== id);
        this.writeMetadataCache();

        if (typeof ToolType !== "undefined"
            && ToolType.TEXT.getSetting("fontFamily") === record.family) {
            ToolType.TEXT.setSetting("fontFamily", "Segoe UI");
            window.app?.fire?.("app:tool_setting_changed", ToolType.TEXT,
                "fontFamily", "Segoe UI");
        }
        this.notifyChanged();
        return true;
    }

    static async removeAllFonts() {
        await this.initialize();
        const count = this.records.length;
        if (count === 0) {
            return 0;
        }
        const selectedFamily = typeof ToolType === "undefined"
            ? null : ToolType.TEXT.getSetting("fontFamily");
        const selectedWasCustom = this.isCustomFont(selectedFamily);

        const database = await this.openDatabase();
        await this.runRequest(database, "readwrite", store => store.clear());
        for (const face of this.faces.values()) {
            document.fonts.delete(face);
        }
        this.faces.clear();
        this.records = [];
        this.writeMetadataCache();

        if (selectedWasCustom) {
            ToolType.TEXT.setSetting("fontFamily", "Segoe UI");
            window.app?.fire?.("app:tool_setting_changed", ToolType.TEXT,
                "fontFamily", "Segoe UI");
        }
        this.notifyChanged();
        return count;
    }

    static async loadStoredFonts() {
        if (!("indexedDB" in window) || !("FontFace" in window)) {
            return;
        }
        const cached = this.readMetadataCache();
        if (cached !== null) {
            this.records = cached;
            this.notifyChanged();
            return;
        }

        // Older installations kept the metadata and font bytes in one record.
        // Reading getAll() materialized every font in memory at once (hundreds
        // of megabytes for a large library). Build a lightweight metadata cache
        // gradually, without decoding or registering any font faces.
        const database = await this.openDatabase();
        try {
            const keys = await this.runRequest(
                database, "readonly", store => store.getAllKeys(), false);
            const metadata = [];
            for (let index = 0; index < keys.length; ++index) {
                if (index % 4 === 0) {
                    await this.yieldToBrowser(true);
                }
                const record = await this.runRequest(
                    database, "readonly", store => store.get(keys[index]), false);
                if (record !== undefined) {
                    metadata.push(this.toMetadata(record));
                }
            }
            this.records = metadata;
            this.writeMetadataCache();
        } finally {
            database.close();
        }
        this.notifyChanged();
    }

    static yieldToBrowser(preferIdle = false) {
        if (preferIdle && typeof requestIdleCallback === "function") {
            return new Promise(resolve => requestIdleCallback(() => resolve(), {timeout: 100}));
        }
        if (typeof scheduler !== "undefined" && typeof scheduler.yield === "function") {
            return scheduler.yield();
        }
        return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }

    static toMetadata(record) {
        return {
            id: record.id,
            name: record.name,
            family: record.family,
            fileName: record.fileName,
            type: record.type,
            size: record.size,
            addedAt: record.addedAt
        };
    }

    static readMetadataCache() {
        try {
            const records = JSON.parse(localStorage.getItem(this.metadataCacheKey) || "null");
            if (!Array.isArray(records)) {
                return null;
            }
            if (!records.every(record => record && typeof record.id === "string"
                && typeof record.name === "string" && typeof record.family === "string")) {
                return null;
            }
            return records.map(record => this.toMetadata(record));
        } catch (_) {
            return null;
        }
    }

    static writeMetadataCache() {
        try {
            localStorage.setItem(this.metadataCacheKey, JSON.stringify(
                this.records.map(record => this.toMetadata(record))));
        } catch (error) {
            console.warn("Could not cache font metadata", error);
        }
    }

    static isInitializing() {
        return this.initialization !== null && !this.metadataReady;
    }

    static isCustomFont(familyOrId) {
        return this.records.some(record => record.id === familyOrId || record.family === familyOrId);
    }

    static async ensureLoaded(familyOrId) {
        await this.initialize();
        const record = this.records.find(candidate =>
            candidate.id === familyOrId || candidate.family === familyOrId);
        if (record === undefined) {
            return null;
        }
        if (this.faces.has(record.id)) {
            return this.faces.get(record.id);
        }
        if (this.loadingFaces.has(record.id)) {
            return this.loadingFaces.get(record.id);
        }

        const queued = this.faceLoadQueue.then(async () => {
            await this.yieldToBrowser();
            const database = await this.openDatabase();
            const stored = await this.runRequest(
                database, "readonly", store => store.get(record.id));
            if (stored === undefined) {
                return null;
            }
            const face = await this.createFace(stored);
            if (!this.records.some(candidate => candidate.id === record.id)) {
                document.fonts.delete(face);
                return null;
            }
            this.faces.set(record.id, face);
            return face;
        });
        // FontFace parsing contains synchronous work. Keep previews serialized
        // so a newly visible group of rows cannot decode many fonts in one
        // frame and recreate the original UI stall.
        this.faceLoadQueue = queued.catch(() => {});
        const loading = queued.finally(() => this.loadingFaces.delete(record.id));
        this.loadingFaces.set(record.id, loading);
        return loading;
    }

    static async createFace(record) {
        const face = new FontFace(record.family, record.data);
        await face.load();
        document.fonts.add(face);
        return face;
    }

    static openDatabase() {
        return new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) {
                reject(new Error("Persistent browser storage is not available"));
                return;
            }
            const request = indexedDB.open(this.databaseName, this.databaseVersion);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName, {keyPath: "id"});
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not open font storage"));
        });
    }

    static runRequest(database, mode, callback, closeDatabase = true) {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, mode);
            const request = callback(transaction.objectStore(this.storeName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Font storage operation failed"));
            transaction.oncomplete = () => {
                if (closeDatabase) {
                    database.close();
                }
            };
            transaction.onabort = () => {
                if (closeDatabase) {
                    database.close();
                }
                reject(transaction.error || new Error("Font storage transaction failed"));
            };
        });
    }

    static notifyChanged() {
        window.dispatchEvent(new CustomEvent("paintdotjs:fonts-changed", {
            detail: {fonts: this.getFonts()}
        }));
    }
}
