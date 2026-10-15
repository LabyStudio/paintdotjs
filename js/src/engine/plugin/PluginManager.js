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

class PluginManager {

    static apiVersion = 1;
    static databaseName = "paintdotjs-plugins";
    static storeName = "plugins";
    static database = null;
    static records = [];
    static runtimePlugins = new Map();
    static effectDefinitions = new Map();
    static loadErrors = [];
    static initialization = null;
    static registrationTarget = null;
    static registrationMetadata = null;

    static initialize() {
        this.installPublicApi();
        if (this.initialization === null) {
            this.initialization = this.loadPlugins();
        }
        return this.initialization;
    }

    static installPublicApi() {
        if (window.paintDotJs !== undefined) {
            return;
        }
        const controls = Object.freeze({
            range: (key, label, min, max, defaultValue, step = 1, options = {}) => ({
                type: "range", key, label, min, max, defaultValue, step, ...options
            }),
            checkbox: (key, label, defaultValue = false) => ({
                type: "checkbox", key, label, defaultValue
            }),
            select: (key, label, defaultValue, choices) => ({
                type: "select", key, label, defaultValue, choices
            }),
            color: (key, label, defaultValue = "#000000") => ({
                type: "color", key, label, defaultValue
            }),
            text: (key, label, defaultValue = "") => ({
                type: "text", key, label, defaultValue
            })
        });
        const utils = Object.freeze({
            clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
            clampByte: value => Math.max(0, Math.min(255, Math.round(value)))
        });
        window.paintDotJs = Object.freeze({
            apiVersion: this.apiVersion,
            controls,
            utils,
            pixels: PluginPixels,
            registerPlugin: definition => this.captureRegistration(definition)
        });
    }

    static captureRegistration(definition) {
        if (this.registrationTarget === null) {
            throw new Error("paintDotJs.registerPlugin() may only be called while a plugin is loading.");
        }
        this.registrationTarget.push(this.registrationMetadata === null
            ? definition : {...definition, ...this.registrationMetadata});
    }

    static async loadPlugins() {
        try {
            this.database = await this.openDatabase();
            this.records = await this.readAllRecords();
            this.records.sort((left, right) => left.name.localeCompare(right.name));
            for (const record of this.records) {
                if (!record.enabled) {
                    continue;
                }
                try {
                    const plugin = await this.evaluateSource(record.source, record.fileName, record.manifest || null);
                    if (plugin.id !== record.id) {
                        throw new Error(`The plugin id changed from ${record.id} to ${plugin.id}.`);
                    }
                    this.activatePlugin(plugin);
                } catch (error) {
                    this.loadErrors.push({
                        id: record.id,
                        name: record.name,
                        message: error.message
                    });
                    console.error(`Could not load plugin ${record.name}`, error);
                }
            }
        } catch (error) {
            this.loadErrors.push({
                id: "storage",
                name: "Plugin storage",
                message: error.message
            });
            console.warn("Could not initialize plugins", error);
        }
        this.dispatchChanged();
    }

    static isPluginFile(file) {
        if (file === null || file === undefined) {
            return false;
        }
        const name = String(file.name || "").toLowerCase();
        return name.endsWith(".paintjs");
    }

    static async readPackage(file) {
        if (window.ZipArchive === undefined) {
            throw new Error("ZIP support is unavailable in this build.");
        }
        let entryCount = 0;
        let declaredSize = 0;
        const archive = window.ZipArchive.unzipSync(new Uint8Array(await file.arrayBuffer()), {
            filter: entry => {
                ++entryCount;
                declaredSize += entry.originalSize;
                if (entryCount > 128) {
                    throw new Error("Plugin packages may contain at most 128 files.");
                }
                if (declaredSize > 8 * 1024 * 1024) {
                    throw new Error("The extracted plugin package may not exceed 8 MB.");
                }
                return true;
            }
        });
        const names = Object.keys(archive).filter(name => !name.endsWith("/"));
        for (let name of names) {
            if (name !== "plugin.json" && name !== "plugin.js"
                && !/^assets\/[A-Za-z0-9_.-]+$/.test(name)) {
                throw new Error(`Invalid file in plugin package: ${name}`);
            }
        }
        if (archive["plugin.json"] === undefined || archive["plugin.js"] === undefined) {
            throw new Error("Plugin packages must contain plugin.json and plugin.js at their root.");
        }

        let decoder = new TextDecoder("utf-8", {fatal: true});
        let manifest;
        try {
            manifest = JSON.parse(decoder.decode(archive["plugin.json"]));
        } catch (error) {
            throw new Error(`plugin.json is invalid: ${error.message}`);
        }
        const metadata = this.normalizeManifest(manifest, file.name);
        let source = decoder.decode(archive["plugin.js"]);
        if (source.length > 1024 * 1024) {
            throw new Error("plugin.js may not exceed 1 MB.");
        }
        source = this.resolvePackageAssets(source, archive);
        return {source, manifest: metadata};
    }

    static resolvePackageAssets(source, archive) {
        const mimeTypes = {
            gif: "image/gif",
            jpeg: "image/jpeg",
            jpg: "image/jpeg",
            json: "application/json",
            png: "image/png",
            svg: "image/svg+xml",
            txt: "text/plain",
            webp: "image/webp"
        };
        let resolved = source.replace(/paintDotJs\.asset\(\s*(["'])([A-Za-z0-9_.-]+)\1\s*\)/g,
            (match, quote, assetName) => {
                let data = archive[`assets/${assetName}`];
                if (data === undefined) {
                    throw new Error(`Plugin asset is missing: ${assetName}`);
                }
                if (data.byteLength > 384 * 1024) {
                    throw new Error(`Plugin asset exceeds 384 KB: ${assetName}`);
                }
                let extension = assetName.split(".").pop().toLowerCase();
                let mimeType = mimeTypes[extension];
                if (mimeType === undefined) {
                    throw new Error(`Plugin asset type is unsupported: ${assetName}`);
                }
                let binary = "";
                for (let offset = 0; offset < data.length; offset += 0x8000) {
                    binary += String.fromCharCode(...data.subarray(offset, offset + 0x8000));
                }
                return JSON.stringify(`data:${mimeType};base64,${btoa(binary)}`);
            });
        if (resolved.includes("paintDotJs.asset(")) {
            throw new Error("plugin.js contains an invalid paintDotJs.asset() call.");
        }
        return resolved;
    }

    static normalizeManifest(manifest, fileName) {
        if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
            throw new Error("plugin.json must contain an object.");
        }
        if (manifest.apiVersion !== this.apiVersion) {
            throw new Error(`This build supports plugin API version ${this.apiVersion}.`);
        }
        let website = this.validateText(manifest.website, "Plugin website", 500);
        if (new URL(website).protocol !== "https:") {
            throw new Error("Plugin websites must use HTTPS.");
        }
        return {
            apiVersion: manifest.apiVersion,
            id: this.validateId(manifest.id, "Plugin id"),
            name: this.validateText(manifest.name, "Plugin name", 80),
            version: this.validateText(manifest.version, "Plugin version", 32),
            author: this.validateText(manifest.author, "Plugin author", 80),
            copyright: this.optionalText(manifest.copyright, "", 120),
            description: this.validateText(manifest.description, "Plugin description", 500),
            category: this.validateText(manifest.category, "Plugin category", 80),
            license: this.validateText(manifest.license, "Plugin license", 120),
            dialogTitle: this.optionalText(manifest.dialogTitle, "", 120),
            website,
            sourceFileName: fileName
        };
    }

    static async importFile(file, expected = null) {
        await this.initialize();
        if (!this.isPluginFile(file)) {
            throw new Error("Choose a .paintjs plugin package.");
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new Error("Plugin packages may not exceed 5 MB.");
        }
        const packageData = await this.readPackage(file);
        const source = packageData.source;
        const plugin = await this.evaluateSource(source, file.name, packageData.manifest);
        PluginFileTypes.assertAvailable(plugin);
        if (expected && (plugin.id !== expected.id || plugin.version !== expected.version)) {
            throw new Error("The plugin identity or version does not match the catalog.");
        }
        const existing = this.records.find(record => record.id === plugin.id) || null;
        const record = {
            id: plugin.id,
            name: plugin.name,
            author: plugin.author,
            version: plugin.version,
            description: plugin.description,
            fileName: file.name,
            source,
            manifest: packageData.manifest,
            enabled: true,
            effectCount: plugin.effects.length,
            fileTypeCount: plugin.fileTypes.length,
            importedAt: existing?.importedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.writeRecord(record);
        if (existing !== null) {
            this.deactivatePlugin(existing.id);
            const index = this.records.indexOf(existing);
            this.records.splice(index, 1, record);
        } else {
            this.records.push(record);
        }
        this.activatePlugin(plugin);
        this.clearLoadError(plugin.id);
        this.sortRecords();
        this.dispatchChanged(plugin.id);
        return this.publicMetadata(record);
    }

    static async setEnabled(id, enabled) {
        await this.initialize();
        const record = this.records.find(candidate => candidate.id === id);
        if (record === undefined || record.enabled === enabled) {
            return false;
        }
        if (enabled) {
            const plugin = await this.evaluateSource(record.source, record.fileName, record.manifest || null);
            this.activatePlugin(plugin);
        } else {
            this.deactivatePlugin(id);
        }
        record.enabled = enabled;
        await this.writeRecord(record);
        this.clearLoadError(id);
        this.dispatchChanged();
        return true;
    }

    static async remove(id) {
        await this.initialize();
        const index = this.records.findIndex(record => record.id === id);
        if (index < 0) {
            return false;
        }
        this.deactivatePlugin(id);
        await this.deleteRecord(id);
        this.records.splice(index, 1);
        this.clearLoadError(id);
        this.dispatchChanged();
        return true;
    }

    static getPlugins() {
        return this.records.map(record => this.publicMetadata(record));
    }

    static getLoadErrors() {
        return this.loadErrors.map(error => ({...error}));
    }

    static getEffectDefinitions() {
        return Array.from(this.effectDefinitions.values());
    }

    static getRuntimePlugins() {
        return Array.from(this.runtimePlugins.values()).map(plugin => ({
            id: plugin.id,
            name: plugin.name,
            author: plugin.author,
            copyright: plugin.copyright,
            website: plugin.website,
            sourceFileName: plugin.sourceFileName,
            version: plugin.version,
            description: plugin.description,
            effects: plugin.effects.map(effect => effect.definition)
                .sort((left, right) => left.displayName.localeCompare(right.displayName))
        })).sort((left, right) => left.name.localeCompare(right.name));
    }

    static async evaluateSource(source, fileName, manifest = null) {
        if (this.registrationTarget !== null) {
            throw new Error("Another plugin is already being loaded.");
        }
        const registrations = [];
        this.registrationTarget = registrations;
        this.registrationMetadata = manifest;
        let url = URL.createObjectURL(new Blob([source], {type: "text/javascript"}));
        let script = document.createElement("script");
        script.src = url;
        script.dataset.paintDotJsPlugin = fileName;
        try {
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error(`${fileName} could not be evaluated.`));
                document.head.appendChild(script);
            });
        } finally {
            script.remove();
            URL.revokeObjectURL(url);
            this.registrationTarget = null;
            this.registrationMetadata = null;
        }
        if (registrations.length !== 1) {
            throw new Error(`${fileName} must call paintDotJs.registerPlugin() exactly once.`);
        }
        let plugin = this.normalizePlugin(registrations[0]);
        if (plugin.workerSafe) {
            for (let effect of plugin.effects) {
                effect.definition.workerPlugin = {source, effectId: effect.id, manifest};
            }
        }
        return plugin;
    }

    static normalizePlugin(definition) {
        if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
            throw new Error("The plugin definition must be an object.");
        }
        if (definition.apiVersion !== this.apiVersion) {
            throw new Error(`This build supports plugin API version ${this.apiVersion}.`);
        }
        const id = this.validateId(definition.id, "Plugin id");
        const name = this.validateText(definition.name, "Plugin name", 80);
        const effects = Array.isArray(definition.effects) ? definition.effects : [];
        const fileTypes = Array.isArray(definition.fileTypes) ? definition.fileTypes : [];
        if (Array.isArray(definition.shapes) && definition.shapes.length > 0) {
            throw new Error("JavaScript plugins cannot register shapes. Import Paint.NET .xaml files in Settings → Shapes.");
        }
        const capabilityCount = effects.length + fileTypes.length;
        if (capabilityCount === 0 || capabilityCount > 128) {
            throw new Error("A plugin must define between 1 and 128 effects and/or file types.");
        }
        const effectIds = new Set();
        const plugin = {
            id,
            name,
            workerSafe: definition.workerSafe === true,
            author: this.optionalText(definition.author, "Unknown", 80),
            copyright: this.optionalText(definition.copyright, "", 120),
            website: this.optionalText(definition.website, "", 500),
            sourceFileName: this.optionalText(definition.sourceFileName, "", 160),
            version: this.optionalText(definition.version, "1.0.0", 32),
            description: this.optionalText(definition.description, "", 500),
            dialogTitle: this.optionalText(definition.dialogTitle, "", 120),
            effects: [],
            fileTypes: []
        };
        for (const effectDefinition of effects) {
            const effect = this.normalizeEffect(plugin, effectDefinition);
            if (effectIds.has(effect.id)) {
                throw new Error(`Effect id ${effect.id} is defined more than once.`);
            }
            effectIds.add(effect.id);
            plugin.effects.push(effect);
        }
        let fileTypeIds = new Set();
        for (let type of fileTypes) {
            let normalized = PluginFileTypes.normalize(plugin, type);
            if (fileTypeIds.has(normalized.id)) {
                throw new Error(`Duplicate file type: ${normalized.id}`);
            }
            fileTypeIds.add(normalized.id);
            plugin.fileTypes.push(normalized);
        }
        PluginFileTypes.assertAvailable(plugin);
        return plugin;
    }

    static normalizeEffect(plugin, effect) {
        if (effect === null || typeof effect !== "object" || Array.isArray(effect)) {
            throw new Error("Each effect definition must be an object.");
        }
        const id = this.validateId(effect.id, "Effect id");
        const name = this.validateText(effect.name, `Effect ${id} name`, 80);
        if (typeof effect.render !== "function" && typeof effect.renderPixel !== "function") {
            throw new Error(`Effect ${id} must define render() or renderPixel().`);
        }
        if (typeof effect.render === "function" && typeof effect.renderPixel === "function") {
            throw new Error(`Effect ${id} cannot define both render() and renderPixel().`);
        }
        const controls = this.normalizeControls(effect.controls || [], id);
        const menu = this.optionalText(effect.menu, "Effects", 16);
        if (!["Effects", "Adjustments"].includes(menu)) {
            throw new Error(`Effect ${id} menu must be Effects or Adjustments.`);
        }
        const runtimeId = `plugin.${plugin.id}.${id}`;
        const definition = {
            id: runtimeId,
            actionId: `menu.effects.${runtimeId}`,
            icon: this.normalizeIcon(effect.icon),
            controls,
            dialogTitle: this.optionalText(effect.dialogTitle, plugin.dialogTitle || name, 120),
            displayName: name,
            pluginId: plugin.id,
            pluginName: plugin.name,
            menu,
            category: this.optionalText(effect.category, "Plugins", 48)
        };
        if (typeof effect.renderPixel === "function") {
            definition.prepare = null;
            definition.transform = (r, g, b, a, values, _state, context) => {
                const result = effect.renderPixel({r, g, b, a, values, ...context});
                if (!Array.isArray(result) && !(result instanceof Uint8ClampedArray)) {
                    throw new Error(`${plugin.name}: ${name} renderPixel() must return four channels.`);
                }
                if (result.length !== 4) {
                    throw new Error(`${plugin.name}: ${name} renderPixel() must return four channels.`);
                }
                return result;
            };
        } else {
            definition.apply = (source, width, height, values, selection = null) => {
                const sourceData = new Uint8ClampedArray(source.data);
                const destination = new ImageData(new Uint8ClampedArray(sourceData), width, height);
                const result = effect.render({
                    source: sourceData,
                    destination: destination.data,
                    width,
                    height,
                    values,
                    selection: selection ? new Uint8Array(selection) : null,
                    selectionBounds: PluginPixels.selectionBounds(selection, width, height)
                });
                if (result instanceof Promise) {
                    throw new Error(`${plugin.name}: ${name} render() must be synchronous in API version 1.`);
                }
                if (result === undefined || result === destination || result === destination.data) {
                    return destination;
                }
                if (result instanceof ImageData) {
                    if (result.width !== width || result.height !== height) {
                        throw new Error(`${plugin.name}: ${name} returned an image with the wrong size.`);
                    }
                    return result;
                }
                if (result instanceof Uint8ClampedArray && result.length === destination.data.length) {
                    return new ImageData(result, width, height);
                }
                throw new Error(`${plugin.name}: ${name} render() returned an unsupported value.`);
            };
        }
        return {id, name, definition};
    }

    static normalizeControls(controls, effectId) {
        if (!Array.isArray(controls) || controls.length > 32) {
            throw new Error(`Effect ${effectId} controls must be an array with at most 32 entries.`);
        }
        const keys = new Set();
        return controls.map(control => {
            if (control === null || typeof control !== "object" || Array.isArray(control)) {
                throw new Error(`Effect ${effectId} contains an invalid control.`);
            }
            const key = this.validateId(control.key, `Effect ${effectId} control key`);
            if (keys.has(key)) {
                throw new Error(`Effect ${effectId} control ${key} is defined more than once.`);
            }
            keys.add(key);
            const label = this.optionalText(control.label, "", 80);
            if (control.type === "range") {
                const min = Number(control.min);
                const max = Number(control.max);
                const step = Number(control.step ?? 1);
                const defaultValue = Number(control.defaultValue);
                if (![min, max, step, defaultValue].every(Number.isFinite)
                    || max <= min || step <= 0 || defaultValue < min || defaultValue > max) {
                    throw new Error(`Effect ${effectId} range ${key} has invalid numeric values.`);
                }
                const track = this.optionalText(control.track, "default", 24);
                if (!["default", "hue", "hue-shift", "saturation", "saturation-adjustment",
                    "lightness", "alpha", "contrast", "cyan-red", "magenta-green",
                    "yellow-blue", "temperature", "tint"].includes(track)) {
                    throw new Error(`Effect ${effectId} range ${key} uses an unsupported track style.`);
                }
                return {type: "range", key, label, min, max, step, defaultValue, track};
            }
            if (control.type === "checkbox") {
                return {type: "checkbox", key, label, defaultValue: Boolean(control.defaultValue)};
            }
            if (control.type === "color" || control.type === "text") {
                let defaultValue = String(control.defaultValue ?? "");
                if (defaultValue.length > 4096 || (control.type === "color" && !/^#[0-9a-f]{6}$/i.test(defaultValue))) {
                    throw new Error(`Effect ${effectId} control ${key} has an invalid default value.`);
                }
                return {type: control.type, key, label, defaultValue};
            }
            if (control.type === "select") {
                if (!Array.isArray(control.choices) || control.choices.length === 0
                    || control.choices.length > 64) {
                    throw new Error(`Effect ${effectId} select ${key} must provide choices.`);
                }
                const choices = control.choices.map(choice => {
                    if (Array.isArray(choice)) {
                        return {value: String(choice[0]), label: String(choice[1])};
                    }
                    return {value: String(choice.value), label: String(choice.label)};
                });
                const defaultValue = String(control.defaultValue);
                if (!choices.some(choice => choice.value === defaultValue)) {
                    throw new Error(`Effect ${effectId} select ${key} has an invalid default value.`);
                }
                return {type: "select", key, label, defaultValue, choices};
            }
            throw new Error(`Effect ${effectId} control ${key} uses unsupported type ${control.type}.`);
        });
    }

    static normalizeIcon(icon) {
        if (icon === undefined) {
            return "menu_help_plugins_icon.png";
        }
        const value = String(icon);
        if (/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
            && value.length <= 512 * 1024) {
            return value;
        }
        if (!/^[A-Za-z0-9_.-]+\.png$/.test(value)) {
            throw new Error("Effect icons must name a built-in PNG file or contain a PNG data URL.");
        }
        return value;
    }

    static activatePlugin(plugin) {
        if (this.runtimePlugins.has(plugin.id)) {
            throw new Error(`Plugin ${plugin.id} is already active.`);
        }
        PluginFileTypes.assertAvailable(plugin);
        this.runtimePlugins.set(plugin.id, plugin);
        for (let type of plugin.fileTypes) {
            PluginFileTypes.definitions.set(type.id, type);
        }
        for (const effect of plugin.effects) {
            this.effectDefinitions.set(effect.definition.id, effect.definition);
            if (typeof ActionRegistry !== "undefined" && ActionRegistry.initialized) {
                ActionRegistry.register(new BitmapEffectAction(effect.definition));
            }
        }
    }

    static deactivatePlugin(id) {
        const plugin = this.runtimePlugins.get(id);
        if (plugin === undefined) {
            return;
        }
        for (const effect of plugin.effects) {
            this.effectDefinitions.delete(effect.definition.id);
            BitmapEffectAction.forgetDefinition(effect.definition);
            if (typeof ActionRegistry !== "undefined" && ActionRegistry.initialized) {
                ActionRegistry.unregister(effect.definition.actionId);
            }
        }
        for (let type of plugin.fileTypes) {
            PluginFileTypes.definitions.delete(type.id);
        }
        this.runtimePlugins.delete(id);
    }

    static validateId(value, label) {
        if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(value)) {
            throw new Error(`${label} must contain only lowercase letters, numbers, dots, dashes, or underscores.`);
        }
        return value;
    }

    static validateText(value, label, maxLength) {
        if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
            throw new Error(`${label} must be a non-empty string of at most ${maxLength} characters.`);
        }
        return value.trim();
    }

    static optionalText(value, fallback, maxLength) {
        if (value === undefined) {
            return fallback;
        }
        if (typeof value !== "string" || value.length > maxLength) {
            throw new Error(`Plugin metadata values may not exceed ${maxLength} characters.`);
        }
        return value.trim();
    }

    static publicMetadata(record) {
        return {
            id: record.id,
            name: record.name,
            author: record.author,
            version: record.version,
            description: record.description,
            fileName: record.fileName,
            enabled: record.enabled,
            effectCount: record.effectCount,
            fileTypeCount: record.fileTypeCount || 0,
            importedAt: record.importedAt,
            updatedAt: record.updatedAt
        };
    }

    static sortRecords() {
        this.records.sort((left, right) => left.name.localeCompare(right.name));
    }

    static clearLoadError(id) {
        this.loadErrors = this.loadErrors.filter(error => error.id !== id);
    }

    static dispatchChanged(addedId = null) {
        window.dispatchEvent(new CustomEvent("paintdotjs:plugins-changed", {
            detail: {addedId}
        }));
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
            request.onerror = () => reject(request.error || new Error("Could not open plugin storage."));
            request.onblocked = () => reject(new Error("Plugin storage is blocked by another window."));
        });
    }

    static readAllRecords() {
        return new Promise((resolve, reject) => {
            const request = this.database.transaction(this.storeName, "readonly")
                .objectStore(this.storeName).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error || new Error("Could not read plugins."));
        });
    }

    static writeRecord(record) {
        return this.runRequest("readwrite", store => store.put(record));
    }

    static deleteRecord(id) {
        return this.runRequest("readwrite", store => store.delete(id));
    }

    static runRequest(mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(this.storeName, mode);
            const request = callback(transaction.objectStore(this.storeName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Plugin storage operation failed."));
            transaction.onabort = () => reject(transaction.error || new Error("Plugin storage transaction failed."));
        });
    }
}
