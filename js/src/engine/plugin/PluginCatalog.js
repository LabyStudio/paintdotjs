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

class PluginCatalog {

    static defaultUrl = "https://labystudio.github.io/paintdotjs-plugins/catalog.json";

    static validateUrl(value) {
        let url = new URL(value);
        let local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
        if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password) {
            throw new Error("Use an HTTPS catalog URL, or HTTP on localhost for development.");
        }
        return url;
    }

    static async download(url, maximumBytes) {
        let response = await fetch(url, {cache: "no-cache", credentials: "omit",
            redirect: "error", signal: AbortSignal.timeout(15000)});
        if (!response.ok) {
            throw new Error(`Download failed (HTTP ${response.status}). The catalog may not be published yet.`);
        }
        let reader = response.body.getReader();
        let chunks = [], length = 0;
        try {
            while (true) {
                let {done, value} = await reader.read();
                if (done) {
                    break;
                }
                length += value.length;
                if (length > maximumBytes) {
                    throw new Error("The catalog or plugin exceeds the download size limit.");
                }
                chunks.push(value);
            }
        } finally {
            await reader.cancel();
        }
        let bytes = new Uint8Array(length), offset = 0;
        for (let chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        return bytes;
    }

    static async load() {
        let url = this.validateUrl(this.defaultUrl);
        let bytes = await this.download(url, 1024 * 1024);
        let catalog = JSON.parse(new TextDecoder().decode(bytes));
        if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.plugins) || catalog.plugins.length > 1000) {
            throw new Error("Unsupported plugin catalog format.");
        }
        let ids = new Set();
        let base = new URL("./", url);
        return catalog.plugins.map(entry => {
            let id = PluginManager.validateId(entry.id, "Catalog plugin id");
            if (ids.has(id)) {
                throw new Error(`Duplicate catalog plugin: ${id}`);
            }
            ids.add(id);
            if (typeof entry.file !== "string" || !/^[a-zA-Z0-9_./-]+\.paintjs$/.test(entry.file)
                || entry.file.split("/").includes("..") || entry.file.startsWith("/")) {
                throw new Error(`Invalid package path for ${id}.`);
            }
            if (!/^[a-f0-9]{64}$/.test(entry.sha256) || entry.apiVersion !== PluginManager.apiVersion) {
                throw new Error(`Invalid integrity hash or incompatible API for ${id}.`);
            }
            let website = PluginManager.optionalText(entry.website, "", 500);
            if (website && new URL(website).protocol !== "https:") {
                throw new Error(`Invalid creator website for ${id}.`);
            }
            return {
                id, name: PluginManager.validateText(entry.name, "Catalog name", 80),
                version: PluginManager.validateText(entry.version, "Catalog version", 32),
                description: PluginManager.optionalText(entry.description, "", 500),
                author: PluginManager.optionalText(entry.author, "Unknown", 80),
                website,
                license: PluginManager.validateText(entry.license, "Plugin license", 120),
                category: PluginManager.optionalText(entry.category, "Plugins", 80),
                sha256: entry.sha256, url: new URL(entry.file, base).href
            };
        });
    }

    static async install(entry) {
        let bytes = await this.download(this.validateUrl(entry.url), 5 * 1024 * 1024);
        let hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        let hex = Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join("");
        if (hex !== entry.sha256) {
            throw new Error("Plugin integrity check failed. Nothing was installed. Refresh the catalog and try again.");
        }
        let file = new Blob([bytes], {type: "text/javascript"});
        Object.defineProperty(file, "name", {value: entry.id + ".paintjs"});
        return PluginManager.importFile(file, entry);
    }
}
