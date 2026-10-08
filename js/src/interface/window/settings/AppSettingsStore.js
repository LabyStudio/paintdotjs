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

class AppSettingsStore {

    static storageKey = "paintdotjs.settings.v1";
    static checkerboardDefaultMigrationKey = "paintdotjs.checkerboard-default-v5";
    static systemColorSchemeQuery = null;

    static defaults = {
        ui: {
            animations: true,
            translucentWindows: true,
            overscroll: true,
            autoScrollWhileDrawing: true,
            autoSelectVisibleLayer: false,
            colorScheme: "default",
            language: "auto"
        },
        canvas: {
            dropShadow: true,
            customBorder: false,
            borderColor: "#808080",
            checkerboardBrightness: 75
        },
        tools: {
            defaultTool: "paintBrushTool",
            primaryColor: -16777216,
            secondaryColor: -1
        },
        workspace: {
            measurementUnit: "pixel",
            lastNonPixelUnit: "inch",
            newFileMaintainAspectRatio: false,
            showPixelGrid: false,
            showRulers: false
        },
        windows: {},
        dialogs: {},
        fileTypes: {saveOptions: {}},
        pen: {pointerInput: true},
        graphics: {hardwareAcceleration: true, renderingDevice: "auto"},
        colorManagement: {advancedColor: false},
        updates: {automatic: true, prerelease: false}
    };

    static values = AppSettingsStore.load();

    static load() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(this.storageKey) || "{}");

            // Paint.NET 5 uses 75% for the checkerboard. Migrate the old port's
            // 100% default once, while still allowing 100% to be chosen later.
            if (localStorage.getItem(this.checkerboardDefaultMigrationKey) !== "1") {
                if (saved.canvas?.checkerboardBrightness === 100) {
                    saved.canvas.checkerboardBrightness = 75;
                    localStorage.setItem(this.storageKey, JSON.stringify(saved));
                }
                localStorage.setItem(this.checkerboardDefaultMigrationKey, "1");
            }
        } catch (_) {
            // Storage is optional in restricted browser contexts.
        }

        const result = {};
        for (const [section, defaults] of Object.entries(this.defaults)) {
            result[section] = Object.assign({}, defaults, saved[section] || {});
        }
        return result;
    }

    static get(path, fallback = null) {
        const [section, property] = path.split(".");
        return this.values[section]?.[property] ?? fallback;
    }

    static set(path, value) {
        const [section, property] = path.split(".");
        if (this.values[section] === undefined) {
            this.values[section] = {};
        }
        this.values[section][property] = value;

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.values));
        } catch (_) {
            // Continue with the in-memory value when persistence is unavailable.
        }

        if (path.startsWith("ui.") || path.startsWith("canvas.")) {
            this.apply();
        }
        if ((path.startsWith("canvas.") || path === "ui.colorScheme")
            && window.app !== undefined) {
            const workspace = window.app.getActiveDocumentWorkspace?.();
            workspace?.getDocument()?.invalidate();
        }
        window.dispatchEvent(new CustomEvent("paintdotjs:setting-changed", {
            detail: {path, value}
        }));
    }

    static apply() {
        const root = document.documentElement;
        root.classList.toggle("settings-animations-disabled", !this.get("ui.animations", true));
        root.classList.toggle("settings-translucent-windows", this.get("ui.translucentWindows", true));
        root.classList.toggle("settings-canvas-shadow", this.get("canvas.dropShadow", true));
        root.classList.toggle("settings-canvas-custom-border", this.get("canvas.customBorder", false));

        const colorSchemePreference = this.get("ui.colorScheme", "default");
        root.dataset.colorSchemePreference = colorSchemePreference;
        root.dataset.colorScheme = this.resolveColorScheme(colorSchemePreference);
        root.style.setProperty("--custom-canvas-border", this.get("canvas.borderColor", "#808080"));
        const checkerboardBrightness = Math.max(0.25, Math.min(1,
            Number(this.get("canvas.checkerboardBrightness", 75)) / 100));
        root.style.setProperty("--checkerboard-brightness", String(checkerboardBrightness));
        root.style.setProperty("--image-transparency",
            `url("${this.createCheckerboardDataUrl(checkerboardBrightness)}")`);

        const view = document.getElementById("view");
        if (view !== null) {
            view.style.overscrollBehavior = this.get("ui.overscroll", true) ? "auto" : "none";
        }
    }

    static createCheckerboardDataUrl(brightness) {
        const light = Math.round(255 * brightness);
        const dark = Math.round(191 * brightness);
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext("2d");

        context.fillStyle = `rgb(${dark}, ${dark}, ${dark})`;
        context.fillRect(0, 0, 4, 4);
        context.fillRect(4, 4, 4, 4);
        context.fillStyle = `rgb(${light}, ${light}, ${light})`;
        context.fillRect(4, 0, 4, 4);
        context.fillRect(0, 4, 4, 4);
        return canvas.toDataURL("image/png");
    }

    static resolveColorScheme(preference) {
        if (preference !== "default") {
            return preference;
        }
        if (typeof window.matchMedia !== "function") {
            return "dark";
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    static watchSystemColorScheme() {
        if (typeof window.matchMedia !== "function" || this.systemColorSchemeQuery !== null) {
            return;
        }

        this.systemColorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.systemColorSchemeQuery.addEventListener("change", () => {
            if (this.get("ui.colorScheme", "default") !== "default") {
                return;
            }

            this.apply();
            if (window.app !== undefined) {
                window.app.getActiveDocumentWorkspace?.()?.getDocument()?.invalidate();
            }
            window.dispatchEvent(new CustomEvent("paintdotjs:theme-changed", {
                detail: {colorScheme: document.documentElement.dataset.colorScheme, preference: "default"}
            }));
        });
    }
}
