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

class SettingsPenEntry extends SettingsEntry {

    render() {
        this.addHeading("Pen & Tablet");
        this.addCheckbox("pen.pointerInput", "Enable pen and tablet input", {
            note: "Pressure information is used by compatible drawing tools when the browser provides it."
        });
        const pointerSupport = "PointerEvent" in window;
        this.addNote(pointerSupport
            ? "Pointer input is available in this browser."
            : "No compatible pointer input API was detected.");
        this.addButton("Open Windows Pen & Ink settings", () => {
            window.open("ms-settings:pen", "_blank", "noopener");
        }, {disabled: !isApp, tooltip: "Available in the desktop app"});
    }
}
