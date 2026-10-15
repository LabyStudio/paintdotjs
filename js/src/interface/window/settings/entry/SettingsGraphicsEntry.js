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

class SettingsGraphicsEntry extends SettingsEntry {

    render() {
        this.addHeading("Graphics");
        this.addCheckbox("graphics.hardwareAcceleration", "Use hardware acceleration for the user interface", {
            disabled: true,
            note: "Hardware acceleration is controlled by the browser and cannot be changed here."
        });
        this.addNote("Graphics acceleration is " + (this.isWebGlAvailable() ? "available." : "not available."));
        this.addSelect("graphics.renderingDevice", "Rendering device:", [["auto", "Automatic (browser default)"]], {
            disabled: true,
            note: "Rendering-device selection is not available to web applications."
        });
    }

    isWebGlAvailable() {
        try {
            const canvas = document.createElement("canvas");
            return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null;
        } catch (_) {
            return false;
        }
    }
}
