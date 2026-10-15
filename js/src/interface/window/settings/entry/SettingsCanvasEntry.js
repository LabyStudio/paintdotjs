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

class SettingsCanvasEntry extends SettingsEntry {

    render() {
        this.addCheckbox("canvas.dropShadow", "Draw a shadow around the canvas");
        const customBorder = this.addCheckbox("canvas.customBorder", "Use a custom color for the canvas border");
        this.page.append(
            this.createCanvasColorEditor(customBorder),
            this.createCheckerboardBrightnessEditor()
        );
    }

    createCanvasColorEditor(customBorder) {
        const colorEditor = document.createElement("div");
        colorEditor.className = "settings-canvas-color-editor";
        {
            // Color swatch
            const color = document.createElement("input");
            color.type = "color";
            color.className = "settings-canvas-color-swatch";
            color.title = "Canvas border color";
            color.value = AppSettingsStore.get("canvas.borderColor", "#808080");
            colorEditor.appendChild(color);

            // Hue and saturation wheel
            const wheel = document.createElement("div");
            wheel.className = "settings-canvas-color-wheel";
            wheel.title = "Choose hue and saturation";
            const wheelCursor = document.createElement("span");
            wheel.appendChild(wheelCursor);
            colorEditor.appendChild(wheel);

            // Brightness bar
            const verticalControls = document.createElement("div");
            verticalControls.className = "settings-canvas-color-bars";
            const valueBar = document.createElement("input");
            valueBar.type = "range";
            valueBar.min = "0";
            valueBar.max = "255";
            valueBar.value = "128";
            valueBar.title = "Brightness";
            const neutralBar = document.createElement("div");
            neutralBar.className = "settings-canvas-neutral-bar";
            verticalControls.append(valueBar, neutralBar);
            colorEditor.appendChild(verticalControls);

            // RGB channels
            const rgbPanel = document.createElement("div");
            rgbPanel.className = "settings-canvas-rgb";
            const rgbInputs = {};
            for (const [channel, label] of [["red", "R:"], ["green", "G:"], ["blue", "B:"]]) {
                const row = document.createElement("label");
                {
                    const text = document.createElement("span");
                    text.textContent = label;

                    const input = document.createElement("input");
                    input.type = "number";
                    input.min = "0";
                    input.max = "255";
                    input.step = "1";
                    rgbInputs[channel] = input;
                    row.append(text, NumberInput.wrap(input));
                }
                rgbPanel.appendChild(row);
            }

            // Reset button
            const resetColor = document.createElement("button");
            resetColor.type = "button";
            resetColor.className = "settings-inline-reset";
            resetColor.title = "Reset";
            {
                const icon = document.createElement("img");
                icon.src = "assets/icons/reset_icon.png";
                icon.alt = "Reset";
                resetColor.appendChild(icon);
            }
            rgbPanel.appendChild(resetColor);
            colorEditor.appendChild(rgbPanel);

            const readColor = () => Color.fromHex(color.value);
            const updateColorControls = (hex, save = true) => {
                color.value = hex.substring(0, 7);
                const selected = readColor();
                rgbInputs.red.value = selected.getRed();
                rgbInputs.green.value = selected.getGreen();
                rgbInputs.blue.value = selected.getBlue();
                valueBar.value = String(Math.round(selected.getLightness() * 255));
                wheel.style.setProperty("--settings-wheel-hue", String(selected.getHue() * 360));
                const angle = selected.getHue() * Math.PI * 2;
                const distance = selected.getSaturation() * 48;
                wheelCursor.style.left = `calc(50% + ${Math.cos(angle) * distance}px)`;
                wheelCursor.style.top = `calc(50% + ${Math.sin(angle) * distance}px)`;
                if (save) {
                    AppSettingsStore.set("canvas.borderColor", color.value);
                }
            };
            const updateFromRgb = () => {
                const clampChannel = channel => Math.max(0, Math.min(255, Number(rgbInputs[channel].value) || 0));
                const selected = Color.fromRGB(clampChannel("red"), clampChannel("green"), clampChannel("blue"));
                updateColorControls(selected.toHex(), true);
            };
            color.oninput = () => updateColorControls(color.value, true);
            for (const input of Object.values(rgbInputs)) {
                input.oninput = updateFromRgb;
            }
            valueBar.oninput = () => {
                const selected = readColor();
                updateColorControls(Color.fromHSL(selected.getHue(), selected.getSaturation(),
                    Number(valueBar.value) / 255).toHex(), true);
            };
            wheel.onpointerdown = event => {
                if (!customBorder.checked) {
                    return;
                }
                const bounds = wheel.getBoundingClientRect();
                const x = event.clientX - bounds.left - bounds.width / 2;
                const y = event.clientY - bounds.top - bounds.height / 2;
                const saturation = Math.min(1, Math.hypot(x, y) / (bounds.width / 2));
                let hue = Math.atan2(y, x) / (Math.PI * 2);
                if (hue < 0) {
                    hue += 1;
                }
                const current = readColor();
                updateColorControls(Color.fromHSL(hue, saturation, current.getLightness()).toHex(), true);
            };
            resetColor.onclick = () => updateColorControls("#808080", true);
            updateColorControls(color.value, false);

            const updateEditorState = () => {
                const disabled = !customBorder.checked;
                colorEditor.classList.toggle("disabled", disabled);
                colorEditor.setAttribute("aria-disabled", String(disabled));
                color.disabled = disabled;
                valueBar.disabled = disabled;
                resetColor.disabled = disabled;
                for (const input of Object.values(rgbInputs)) {
                    input.disabled = disabled;
                }
            };
            customBorder.onchange = () => {
                AppSettingsStore.set("canvas.customBorder", customBorder.checked);
                updateEditorState();
            };
            updateEditorState();
        }
        return colorEditor;
    }

    createCheckerboardBrightnessEditor() {
        const brightnessGroup = document.createElement("div");
        brightnessGroup.className = "settings-canvas-brightness";
        {
            // Label
            const label = document.createElement("span");
            label.textContent = "Transparency Checkerboard Brightness";
            brightnessGroup.appendChild(label);

            // Controls
            const row = document.createElement("div");
            {
                const range = document.createElement("input");
                range.type = "range";
                range.min = "0.25";
                range.max = "1";
                range.step = "0.01";
                range.value = String(AppSettingsStore.get("canvas.checkerboardBrightness", 75) / 100);

                const output = document.createElement("input");
                output.type = "number";
                output.min = "0.25";
                output.max = "1";
                output.step = "0.01";
                output.value = Number(range.value).toFixed(2);

                const reset = document.createElement("button");
                reset.type = "button";
                reset.className = "settings-inline-reset";
                reset.title = "Reset";
                {
                    const icon = document.createElement("img");
                    icon.src = "assets/icons/reset_icon.png";
                    icon.alt = "Reset";
                    reset.appendChild(icon);
                }

                const setBrightness = value => {
                    const normalized = Math.max(0.25, Math.min(1, Number(value) || 0.75));
                    range.value = String(normalized);
                    output.value = normalized.toFixed(2);
                    AppSettingsStore.set("canvas.checkerboardBrightness", Math.round(normalized * 100));
                };
                range.oninput = () => setBrightness(range.value);
                output.onchange = () => setBrightness(output.value);
                reset.onclick = () => setBrightness(0.75);
                row.append(range, NumberInput.wrap(output), reset);
            }
            brightnessGroup.appendChild(row);
        }
        return brightnessGroup;
    }
}
