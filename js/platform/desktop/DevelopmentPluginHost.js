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
 * The interface design and behavior target Paint.NET 5.2+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

const fs = require('node:fs');
const path = require('node:path');

class DevelopmentPluginHost {

    static fromCommandLine(arguments_, packaged) {
        const prefix = '--dev-plugin=';
        const option = arguments_.find(argument => argument.startsWith(prefix));
        if (option === undefined) {
            return null;
        }
        if (packaged) {
            throw new Error('--dev-plugin is only available in a development checkout.');
        }
        const pluginDirectory = option.slice(prefix.length);
        if (!path.isAbsolute(pluginDirectory)) {
            throw new Error('--dev-plugin requires an absolute plugin directory path.');
        }
        return new DevelopmentPluginHost(pluginDirectory);
    }

    constructor(pluginDirectory) {
        this.pluginDirectory = path.normalize(pluginDirectory);
        this.window = null;
        this.rendererReady = false;
        this.payload = null;
        this.watcher = null;
        this.rebuildTimer = null;
        this.rebuilding = false;
        this.rebuildPending = false;
    }

    async initialize() {
        const manifestPath = path.join(this.pluginDirectory, 'plugin.json');
        const sourcePath = path.join(this.pluginDirectory, 'plugin.js');
        if (!fs.statSync(this.pluginDirectory, {throwIfNoEntry: false})?.isDirectory()
            || !fs.statSync(manifestPath, {throwIfNoEntry: false})?.isFile()
            || !fs.statSync(sourcePath, {throwIfNoEntry: false})?.isFile()) {
            throw new Error(
                `Development plugin directory requires plugin.json and plugin.js: ${this.pluginDirectory}`
            );
        }

        this.payload = await this.buildPayload();
        this.watcher = fs.watch(this.pluginDirectory, {recursive: true}, () => {
            clearTimeout(this.rebuildTimer);
            this.rebuildTimer = setTimeout(() => void this.rebuild(), 150);
        });
        console.log(`[plugin-dev] Watching ${this.pluginDirectory}`);
    }

    attach(window) {
        this.window = window;
        this.rendererReady = false;
    }

    rendererDidBecomeReady(webContents) {
        if (!this.window || this.window.isDestroyed() || this.window.webContents !== webContents) {
            return;
        }
        this.rendererReady = true;
        this.sendPayload();
    }

    reportStatus(status) {
        if (status?.error) {
            console.error(`[plugin-dev] ${status.error}`);
        } else if (status?.name) {
            console.log(`[plugin-dev] Loaded ${status.name} ${status.version}`);
        }
    }

    async buildPayload() {
        const {build} = require('esbuild');
        const manifestPath = path.join(this.pluginDirectory, 'plugin.json');
        const sourcePath = path.join(this.pluginDirectory, 'plugin.js');
        const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
        const result = await build({
            entryPoints: [sourcePath],
            bundle: true,
            write: false,
            format: 'iife',
            platform: 'browser',
            target: ['es2020'],
            minify: false,
            sourcemap: 'inline',
            sourcesContent: true,
            legalComments: 'none'
        });

        const assets = {};
        const assetsDirectory = path.join(this.pluginDirectory, 'assets');
        if (fs.statSync(assetsDirectory, {throwIfNoEntry: false})?.isDirectory()) {
            for (const assetName of (await fs.promises.readdir(assetsDirectory)).sort()) {
                const assetPath = path.join(assetsDirectory, assetName);
                if (!(await fs.promises.stat(assetPath)).isFile()
                    || !/^[A-Za-z0-9_.-]+$/.test(assetName)) {
                    throw new Error(`Development plugin contains an invalid asset: ${assetName}`);
                }
                assets[assetName] = (await fs.promises.readFile(assetPath)).toString('base64');
            }
        }

        return {
            fileName: `${path.basename(this.pluginDirectory)}.paintjs`,
            manifest,
            source: Buffer.from(result.outputFiles[0].contents).toString('utf8'),
            assets
        };
    }

    async rebuild() {
        if (this.rebuilding) {
            this.rebuildPending = true;
            return;
        }
        this.rebuilding = true;
        try {
            do {
                this.rebuildPending = false;
                try {
                    this.payload = await this.buildPayload();
                    this.sendPayload();
                } catch (error) {
                    const message = error.stack || error.message;
                    console.error(`[plugin-dev] Reload failed:\n${message}`);
                    this.send({error: message});
                }
            } while (this.rebuildPending);
        } finally {
            this.rebuilding = false;
        }
    }

    sendPayload() {
        if (this.payload !== null) {
            this.send({plugin: this.payload});
        }
    }

    send(message) {
        if (!this.rendererReady || !this.window || this.window.isDestroyed()) {
            return;
        }
        this.window.webContents.send('desktop:development-plugin', message);
    }

    close() {
        clearTimeout(this.rebuildTimer);
        this.watcher?.close();
        this.watcher = null;
        this.window = null;
        this.rendererReady = false;
    }
}

module.exports = DevelopmentPluginHost;
