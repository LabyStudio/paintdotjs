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

class SettingsColorManagementEntry extends SettingsEntry {

    render() {
        this.addHeading("Color Management");
        this.addCheckbox("colorManagement.advancedColor", "Use Windows advanced color", {
            disabled: true,
            note: "Chrome manages the display color profile. Direct Windows advanced-color control is not available to web applications."
        });
        this.addButton("Open Windows display settings", () => {
            window.open("ms-settings:display", "_blank", "noopener");
        }, {disabled: !isApp, tooltip: "Available in the desktop app"});
        this.addSectionHeading("Status");
        this.addNote("Canvas colors are rendered in the browser's sRGB color space.");
    }
}
