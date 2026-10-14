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
            range: (key, label, min, max, defaultValue, step = 1) => ({
                type: "range", key, label, min, max, defaultValue, step
            }),
            checkbox: (key, label, defaultValue = false) => ({
                type: "checkbox", key, label, defaultValue
            }),
            select: (key, label, defaultValue, choices) => ({
                type: "select", key, label, defaultValue, choices
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
            registerPlugin: definition => this.captureRegistration(definition)
        });
    }

    static captureRegistration(definition) {
        if (this.registrationTarget === null) {
            throw new Error("paintDotJs.registerPlugin() may only be called while a plugin is loading.");
        }
        this.registrationTarget.push(definition);
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
                    const plugin = await this.evaluateSource(record.source, record.fileName);
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
        return name.endsWith(".js") || name.endsWith(".paintjs");
    }

    static async importFile(file) {
        await this.initialize();
        if (!this.isPluginFile(file)) {
            throw new Error("Choose a .js or .paintjs plugin file.");
        }
        if (file.size > 2 * 1024 * 1024) {
            throw new Error("Plugin files may not exceed 2 MB.");
        }
        const source = await file.text();
        const plugin = await this.evaluateSource(source, file.name);
        const existing = this.records.find(record => record.id === plugin.id) || null;
        const record = {
            id: plugin.id,
            name: plugin.name,
            author: plugin.author,
            version: plugin.version,
            description: plugin.description,
            fileName: file.name,
            source,
            enabled: true,
            effectCount: plugin.effects.length,
            importedAt: existing?.importedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existing !== null) {
            this.deactivatePlugin(existing.id);
            const index = this.records.indexOf(existing);
            this.records.splice(index, 1, record);
        } else {
            this.records.push(record);
        }
        await this.writeRecord(record);
        this.activatePlugin(plugin);
        this.clearLoadError(plugin.id);
        this.sortRecords();
        this.dispatchChanged();
        return this.publicMetadata(record);
    }

    static async setEnabled(id, enabled) {
        await this.initialize();
        const record = this.records.find(candidate => candidate.id === id);
        if (record === undefined || record.enabled === enabled) {
            return false;
        }
        if (enabled) {
            const plugin = await this.evaluateSource(record.source, record.fileName);
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
            effects: plugin.effects.map(effect => effect.definition)
        }));
    }

    static async evaluateSource(source, fileName) {
        if (this.registrationTarget !== null) {
            throw new Error("Another plugin is already being loaded.");
        }
        const registrations = [];
        this.registrationTarget = registrations;
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
        }
        if (registrations.length !== 1) {
            throw new Error(`${fileName} must call paintDotJs.registerPlugin() exactly once.`);
        }
        return this.normalizePlugin(registrations[0]);
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
        if (effects.length === 0 || effects.length > 64) {
            throw new Error("A plugin must define between 1 and 64 effects.");
        }
        const effectIds = new Set();
        const plugin = {
            id,
            name,
            author: this.optionalText(definition.author, "Unknown", 80),
            version: this.optionalText(definition.version, "1.0.0", 32),
            description: this.optionalText(definition.description, "", 500),
            effects: []
        };
        for (const effectDefinition of effects) {
            const effect = this.normalizeEffect(plugin, effectDefinition);
            if (effectIds.has(effect.id)) {
                throw new Error(`Effect id ${effect.id} is defined more than once.`);
            }
            effectIds.add(effect.id);
            plugin.effects.push(effect);
        }
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
        const runtimeId = `plugin.${plugin.id}.${id}`;
        const definition = {
            id: runtimeId,
            actionId: `menu.effects.${runtimeId}`,
            icon: this.normalizeIcon(effect.icon),
            controls,
            dialogTitle: name,
            displayName: name,
            pluginId: plugin.id,
            pluginName: plugin.name,
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
            definition.apply = (source, width, height, values) => {
                const sourceData = new Uint8ClampedArray(source.data);
                const destination = new ImageData(new Uint8ClampedArray(sourceData), width, height);
                const result = effect.render({
                    source: sourceData,
                    destination: destination.data,
                    width,
                    height,
                    values
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
            const label = this.validateText(control.label, `Effect ${effectId} control ${key} label`, 80);
            if (control.type === "range") {
                const min = Number(control.min);
                const max = Number(control.max);
                const step = Number(control.step ?? 1);
                const defaultValue = Number(control.defaultValue);
                if (![min, max, step, defaultValue].every(Number.isFinite)
                    || max <= min || step <= 0 || defaultValue < min || defaultValue > max) {
                    throw new Error(`Effect ${effectId} range ${key} has invalid numeric values.`);
                }
                return {type: "range", key, label, min, max, step, defaultValue};
            }
            if (control.type === "checkbox") {
                return {type: "checkbox", key, label, defaultValue: Boolean(control.defaultValue)};
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
        if (!/^[A-Za-z0-9_.-]+\.png$/.test(value)) {
            throw new Error("Effect icons must name a built-in PNG file.");
        }
        return value;
    }

    static activatePlugin(plugin) {
        if (this.runtimePlugins.has(plugin.id)) {
            throw new Error(`Plugin ${plugin.id} is already active.`);
        }
        this.runtimePlugins.set(plugin.id, plugin);
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

    static dispatchChanged() {
        window.dispatchEvent(new CustomEvent("paintdotjs:plugins-changed"));
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
