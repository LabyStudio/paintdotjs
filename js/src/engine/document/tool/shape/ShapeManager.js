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

class ShapeManager {

    static databaseName = "paintdotjs-shapes";
    static storeName = "shapes";
    static database = null;
    static records = [];
    static loadErrors = [];
    static initialization = null;

    static initialize() {
        if (this.initialization === null) {
            this.initialization = this.loadShapes();
        }
        return this.initialization;
    }

    static async loadShapes() {
        try {
            this.database = await this.openDatabase();
            this.records = await this.readAllRecords();
            this.sortRecords();
            for (const record of this.records) {
                try {
                    this.activateRecord(record);
                } catch (error) {
                    this.loadErrors.push({fileName: record.fileName, message: error.message});
                    console.error(`Could not load custom shape ${record.fileName}`, error);
                }
            }
        } catch (error) {
            this.loadErrors.push({fileName: "Shape storage", message: error.message});
            console.warn("Could not initialize custom shapes", error);
        }
        this.dispatchChanged();
    }

    static isShapeFile(file) {
        return file !== null && file !== undefined
            && String(file.name || "").toLowerCase().endsWith(".xaml");
    }

    static async importFiles(files) {
        await this.initialize();
        const shapeFiles = files.filter(file => this.isShapeFile(file));
        const added = [];
        const errors = [];

        for (const file of shapeFiles) {
            try {
                added.push(await this.importFile(file));
            } catch (error) {
                errors.push({file, error});
            }
        }
        return {added, errors};
    }

    static async importFile(file) {
        if (!this.isShapeFile(file)) {
            throw new Error("Choose a Paint.NET .xaml shape file.");
        }
        if (file.size > 512 * 1024) {
            throw new Error("Shape files may not exceed 512 KB.");
        }

        const source = await file.text();
        const definition = PaintDotNetShapeParser.parse(source, file.name);
        const existing = this.records.find(record =>
            record.fileName.localeCompare(file.name, undefined, {sensitivity: "accent"}) === 0) || null;
        const id = existing?.id || crypto.randomUUID();
        const record = {
            id,
            fileName: file.name,
            name: definition.name,
            size: file.size,
            source,
            importedAt: existing?.importedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.writeRecord(record);
        if (existing !== null) {
            ShapeCatalog.unregister(existing.id);
            this.records.splice(this.records.indexOf(existing), 1, record);
        } else {
            this.records.push(record);
        }
        this.activateRecord(record, definition);
        this.loadErrors = this.loadErrors.filter(error => error.fileName !== file.name);
        this.sortRecords();
        this.dispatchChanged();
        return this.publicMetadata(record);
    }

    static async remove(id) {
        await this.initialize();
        const record = this.records.find(candidate => candidate.id === id);
        if (record === undefined) {
            return false;
        }
        await this.deleteRecord(id);
        ShapeCatalog.unregister(id);
        this.records.splice(this.records.indexOf(record), 1);
        this.loadErrors = this.loadErrors.filter(error => error.fileName !== record.fileName);
        this.dispatchChanged();
        return true;
    }

    static async clear() {
        await this.initialize();
        await this.clearRecords();
        for (const record of this.records) {
            ShapeCatalog.unregister(record.id);
        }
        this.records = [];
        this.loadErrors = [];
        this.dispatchChanged();
    }

    static getShapes() {
        return this.records.map(record => this.publicMetadata(record));
    }

    static getLoadErrors() {
        return this.loadErrors.slice();
    }

    static activateRecord(record, parsed = null) {
        const definition = parsed || PaintDotNetShapeParser.parse(record.source, record.fileName);
        ShapeCatalog.register({
            id: `custom.${record.id}`,
            sourceId: record.id,
            name: definition.name,
            fileName: record.fileName,
            path: definition.path,
            fillPath: definition.fillPath,
            fillRule: definition.fillRule,
            viewBox: definition.viewBox
        });
    }

    static publicMetadata(record) {
        const shapeId = `custom.${record.id}`;
        return {
            id: record.id,
            shapeId,
            fileName: record.fileName,
            name: record.name,
            size: record.size,
            loaded: ShapeCatalog.has(shapeId),
            importedAt: record.importedAt,
            updatedAt: record.updatedAt
        };
    }

    static sortRecords() {
        this.records.sort((left, right) => left.fileName.localeCompare(right.fileName, undefined, {sensitivity: "base"}));
    }

    static dispatchChanged() {
        window.dispatchEvent(new CustomEvent("paintdotjs:shapes-changed"));
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
            request.onerror = () => reject(request.error || new Error("Could not open shape storage."));
            request.onblocked = () => reject(new Error("Shape storage is blocked by another window."));
        });
    }

    static readAllRecords() {
        return this.runRequest("readonly", store => store.getAll()).then(records => records || []);
    }

    static writeRecord(record) {
        return this.runRequest("readwrite", store => store.put(record));
    }

    static deleteRecord(id) {
        return this.runRequest("readwrite", store => store.delete(id));
    }

    static clearRecords() {
        return this.runRequest("readwrite", store => store.clear());
    }

    static runRequest(mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(this.storeName, mode);
            const request = callback(transaction.objectStore(this.storeName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Shape storage operation failed."));
            transaction.onabort = () => reject(transaction.error || new Error("Shape storage transaction failed."));
        });
    }
}
