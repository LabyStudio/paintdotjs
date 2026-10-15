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

class SettingsDiagnosticsEntry extends SettingsEntry {

    render() {
        this.addHeading("Diagnostics");
        const diagnostics = [
            ["Application", PdjInfo.productName() + " " + PdjInfo.version()],
            ["User agent", navigator.userAgent],
            ["Platform", navigator.platform || "Unknown"],
            ["Language", navigator.language || "Unknown"],
            ["Logical processors", String(navigator.hardwareConcurrency || "Unknown")],
            ["Device memory", navigator.deviceMemory ? navigator.deviceMemory + " GB" : "Unknown"],
            ["Pointer events", "PointerEvent" in window ? "Available" : "Unavailable"],
            ["WebGL", this.isWebGlAvailable() ? "Available" : "Unavailable"],
            ["Electron", isApp ? "Yes" : "No"]
        ];
        const table = document.createElement("div");
        table.className = "settings-diagnostics-table";
        {
            for (const [key, value] of diagnostics) {
                // Name
                const keyCell = document.createElement("span");
                keyCell.textContent = key;

                // Value
                const valueCell = document.createElement("span");
                valueCell.textContent = value;
                table.append(keyCell, valueCell);
            }
        }
        this.page.appendChild(table);
        this.addButton("Copy to clipboard", async () => {
            await navigator.clipboard.writeText(diagnostics.map(row => row.join(": ")).join("\n"));
            this.setStatus("Diagnostics copied to the clipboard.");
        });
    }
}
