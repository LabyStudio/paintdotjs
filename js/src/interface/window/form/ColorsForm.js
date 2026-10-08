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

class ColorsForm extends Form {

    constructor() {
        super("colorsForm");

        const savedPrimaryColor = typeof AppSettingsStore === "undefined"
            ? Color.BLACK.toPacked()
            : Number(AppSettingsStore.get("tools.primaryColor", Color.BLACK.toPacked()));
        const savedSecondaryColor = typeof AppSettingsStore === "undefined"
            ? Color.WHITE.toPacked()
            : Number(AppSettingsStore.get("tools.secondaryColor", Color.WHITE.toPacked()));
        this.mainColor = Number.isInteger(savedPrimaryColor)
            ? Color.fromPacked(savedPrimaryColor) : Color.BLACK.copy();
        this.secondaryColor = Number.isInteger(savedSecondaryColor)
            ? Color.fromPacked(savedSecondaryColor) : Color.WHITE.copy();
        this.selectedIsPrimary = true;
        this.changed = new EventHandler();

        const savedWindowState = typeof AppSettingsStore === "undefined"
            ? null : AppSettingsStore.get("windows.colorsForm", null);
        this.expanded = savedWindowState?.expanded === true;

        // Paint.NET 5's exact 96-color default palette (packed AARRGGBB).
        this.palette = [
            4278190080, 4282400832, 4294901760, 4294928896, 4294957056, 4290182912,
            4283236096, 4278255393, 4278255504, 4278255615, 4278228223, 4278200063,
            4282908927, 4289855743, 4294901980, 4294901870, 4294967295, 4286611584,
            4286513152, 4286526208, 4286540288, 4284186368, 4280712960, 4278222606,
            4278222662, 4278222719, 4278209151, 4278195071, 4280352895, 4283891839,
            4286513262, 4286513207, 4288716960, 4281348144, 4294934399, 4294947455,
            4294961535, 4292542335, 4289068927, 4286578574, 4286578629, 4286578687,
            4286564863, 4286550783, 4288774143, 4292247551, 4294934509, 4294934454,
            4290822336, 4284506208, 4286529343, 4286535999, 4286542911, 4285366079,
            4283596607, 4282351431, 4282351458, 4282351487, 4282344575, 4282337663,
            4283449215, 4285218687, 4286529398, 4286529371, 2147483648, 2151694400,
            2164195328, 2164222464, 2164250624, 2159476480, 2152529664, 2147548961,
            2147549072, 2147549183, 2147521791, 2147493631, 2152202495, 2159149311,
            2164195548, 2164195438, 2164260863, 2155905152, 2155806720, 2155819776,
            2155833856, 2153479936, 2150006528, 2147516174, 2147516230, 2147516287,
            2147502719, 2147488639, 2149646463, 2153185407, 2155806830, 2155806775
        ].map(value => Color.fromRGBA(
            (value >>> 16) & 0xff,
            (value >>> 8) & 0xff,
            value & 0xff,
            (value >>> 24) & 0xff
        ));
        this.defaultPalette = this.palette.map(color => color.copy());
        this.currentPaletteName = null;
        this.palette = this.loadCurrentPalette();
        this.paletteElements = [];
        this.paletteContainers = [];
        this.colorAddMode = false;

        this.mainColorItem = null;
        this.secondaryColorItem = null;
        this.swatchElement = null;
        this.moreLessButtonElement = null;
        this.sliderPanel = null;

        this.redSlider = null;
        this.greenSlider = null;
        this.blueSlider = null;
        this.hueSlider = null;
        this.saturationSlider = null;
        this.lightnessSlider = null;
        this.alphaSlider = null;

        this.redField = null;
        this.greenField = null;
        this.blueField = null;
        this.hexField = null;
        this.hueField = null;
        this.saturationField = null;
        this.lightnessField = null;
        this.alphaField = null;

        this.updating = false;
    }

    initialize(window) {
        super.initialize(window);
        this.updateWindowSize();
    }

    initializeDefault(window) {
        this.updateWindowSize();
        window.setAnchor(0, 1);
    }

    buildContent() {
        let grid = super.buildContent();
        grid.id = "colorsForm";

        // Current colors
        let currentColors = document.createElement("div");
        currentColors.id = "currentColors";
        {
            // Main color
            this.mainColorItem = new ColorPreviewItem("mainColor");
            this.mainColorItem.initialize(currentColors);
            this.mainColorItem.setPressable(() => {
                this.setSelectedIsPrimary(true);
            });
            currentColors.appendChild(this.mainColorItem.getElement());

            // Secondary color
            this.secondaryColorItem = new ColorPreviewItem("secondaryColor");
            this.secondaryColorItem.initialize(currentColors);
            this.secondaryColorItem.setPressable(() => {
                this.setSelectedIsPrimary(false);
            });
            currentColors.appendChild(this.secondaryColorItem.getElement());

            // Swap colors button
            let swapColorsButton = document.createElement("img");
            swapColorsButton.id = "swapColorsButton";
            swapColorsButton.src = "assets/icons/swap_icon.png";
            swapColorsButton.onclick = () => {
                let temp = this.mainColor;
                this.setMainColor(this.secondaryColor, "swap");
                this.setSecondaryColor(temp, "swap");
            };
            currentColors.appendChild(swapColorsButton)

            // Reset button
            let blackAndWhiteButton = document.createElement("img");
            blackAndWhiteButton.id = "blackAndWhiteButton";
            blackAndWhiteButton.src = "assets/icons/black_and_white_icon.png";
            blackAndWhiteButton.onclick = () => {
                this.setMainColor(Color.BLACK, "reset");
                this.setSecondaryColor(Color.WHITE, "reset");
            };
            currentColors.appendChild(blackAndWhiteButton);
        }
        grid.appendChild(currentColors);

        // More/Less button
        this.moreLessButtonElement = document.createElement("button");
        this.moreLessButtonElement.id = "moreLessButton";
        this.moreLessButtonElement.onclick = () => {
            this.setExpanded(!this.expanded);
        };
        grid.appendChild(this.moreLessButtonElement);

        // Color circle
        this.colorCircle = new ColorCircleItem("colorCircle");
        this.colorCircle.initialize(this);
        this.colorCircle.setChangeCallback(color => {
            this.setSelectedColor(color, "circle");
        });
        grid.appendChild(this.colorCircle.getElement());

        // Color settings strip
        let colorSettingsStrip = document.createElement("div");
        colorSettingsStrip.id = "colorSettingsStrip";
        colorSettingsStrip.classList.add("strip");
        {
            // Color add
            this.colorAddElement = new ColorAddItem();
            this.colorAddElement.initialize(this);
            colorSettingsStrip.appendChild(this.colorAddElement.getElement());

            // Swatch
            this.swatchElement = new SwatchItem();
            this.swatchElement.initialize(this);
            colorSettingsStrip.appendChild(this.swatchElement.getElement());
        }
        grid.appendChild(colorSettingsStrip);

        // Color palette
        let colorPalette = document.createElement("div");
        colorPalette.id = "basicColorPalette";
        colorPalette.classList.add("color-palette");
        this.paletteContainers.push(colorPalette);
        {
            for (let i = 0; i < 32; i++) {
                let colorElement = document.createElement("div");
                colorElement.classList.add("color");
                colorElement.onmousedown = event => {
                    event.preventDefault();
                    this.onPaletteColorClick(i, event.button);
                };
                colorElement.oncontextmenu = event => event.preventDefault();
                this.paletteElements.push(colorElement);
                colorPalette.appendChild(colorElement);
            }
        }
        grid.appendChild(colorPalette);

        // Extended palette
        this.extendedPalette = document.createElement("div");
        this.extendedPalette.id = "extendedColorPalette";
        this.extendedPalette.classList.add("color-palette");
        this.paletteContainers.push(this.extendedPalette);
        {
            for (let i = 32; i < 32 * 3; i++) {
                let colorElement = document.createElement("div");
                colorElement.classList.add("color");
                colorElement.onmousedown = event => {
                    event.preventDefault();
                    this.onPaletteColorClick(i, event.button);
                };
                colorElement.oncontextmenu = event => event.preventDefault();
                this.paletteElements.push(colorElement);
                this.extendedPalette.appendChild(colorElement);
            }
        }
        grid.appendChild(this.extendedPalette);

        // Slider panel (Extended)
        this.sliderPanel = document.createElement("div");
        this.sliderPanel.id = "sliderPanel";
        {
            // RGB Header
            this.sliderPanel.appendChild(this.createHeader("rgbHeader"));

            // Red
            this.sliderPanel.appendChild(this.createChannel(
                "redLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(255, 0, 0)
                ),
                (slider, field) => {
                    this.redSlider = slider;
                    this.redField = field;

                    this.redSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setRed(Math.round(value * 255));
                        this.setSelectedColor(color, "redSlider");
                    });

                    this.redField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setRed(value);
                        this.setSelectedColor(color, "redField");
                    });
                }
            ));

            // Green
            this.sliderPanel.appendChild(this.createChannel(
                "greenLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(0, 255, 0)
                ),
                (slider, field) => {
                    this.greenSlider = slider;
                    this.greenField = field;

                    this.greenSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setGreen(Math.round(value * 255));
                        this.setSelectedColor(color, "greenSlider");
                    });

                    this.greenField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setGreen(value);
                        this.setSelectedColor(color, "greenField");
                    });
                }
            ));

            // Blue
            this.sliderPanel.appendChild(this.createChannel(
                "blueLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(0, 0, 255)
                ),
                (slider, field) => {
                    this.blueSlider = slider;
                    this.blueField = field;

                    this.blueSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setBlue(Math.round(value * 255));
                        this.setSelectedColor(color, "blueSlider");
                    });

                    this.blueField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setBlue(value);
                        this.setSelectedColor(color, "blueField");
                    });
                }
            ));

            // Hex
            this.sliderPanel.appendChild(this.createEntry("hexLabel", "field", () => {
                this.hexField = new TextFieldItem("hex");
                this.hexField.initialize(this);
                this.hexField.setChangeCallback(value => {
                    let red = parseInt(value.substring(0, 2), 16);
                    let green = parseInt(value.substring(2, 4), 16);
                    let blue = parseInt(value.substring(4, 6), 16);
                    if (isNaN(red) || isNaN(green) || isNaN(blue)) {
                        return;
                    }

                    let color = this.getSelectedColor().copy();
                    color.setRed(red);
                    color.setGreen(green);
                    color.setBlue(blue);
                    this.setSelectedColor(color, "hex");
                });
                return this.hexField.getElement();
            }));

            // HSV Header
            this.sliderPanel.appendChild(this.createHeader("hsvHeader"));

            // Hue
            this.sliderPanel.appendChild(this.createChannel(
                "hueLabel",
                v => Color.fromHSL(v, 1, 0.5),
                (slider, field) => {
                    this.hueSlider = slider;
                    this.hueField = field;

                    this.hueSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setHue(value);
                        this.setSelectedColor(color, "hueSlider");
                    });

                    this.hueField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setHue(value / 360);
                        this.setSelectedColor(color, "hueField");
                    });
                }
            ));

            // Saturation
            this.sliderPanel.appendChild(this.createChannel(
                "saturationLabel",
                v => Color.fromHSL(0, v, 0.5),
                (slider, field) => {
                    this.saturationSlider = slider;
                    this.saturationField = field;

                    this.saturationSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setSaturation(value);
                        this.setSelectedColor(color, "saturationSlider");
                    });

                    this.saturationField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setSaturation(value / 100);
                        this.setSelectedColor(color, "saturationField");
                    });
                }
            ));

            // Lightness
            this.sliderPanel.appendChild(this.createChannel(
                "valueLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(255, 255, 255)
                ),
                (slider, field) => {
                    this.lightnessSlider = slider;
                    this.lightnessField = field;

                    this.lightnessSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setLightness(value);
                        this.setSelectedColor(color, "lightnessSlider");
                    });

                    this.lightnessField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setLightness(value / 100);
                        this.setSelectedColor(color, "lightnessField");
                    });
                }
            ));

            // Alpha Header
            this.sliderPanel.appendChild(this.createHeader("alphaHeader"));

            // Alpha
            this.sliderPanel.appendChild(this.createChannel(
                null,
                ColorSliderItem.rangeProvider(
                    Color.fromRGBA(0, 0, 0, 0),
                    Color.fromRGBA(0, 0, 0, 255)
                ),
                (slider, field) => {
                    this.alphaSlider = slider;
                    this.alphaField = field;

                    this.alphaSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setAlpha(Math.round(value * 255));
                        this.setSelectedColor(color, "alphaSlider");
                    });

                    this.alphaField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setAlpha(value);
                        this.setSelectedColor(color, "alphaField");
                    });
                }
            ));
        }
        grid.appendChild(this.sliderPanel);

        this.updatePaletteElements();
        this.updateElements("init");

        return grid;
    }

    createEntry(id, className, callback) {
        // Header entry
        let entry = document.createElement("div");
        entry.classList.add("entry", className);
        {
            // Text
            let text = document.createElement("div");
            text.classList.add("text");
            text.textContent = id === null ? "" : i18n("colorsForm." + id + ".text");
            entry.appendChild(text);

            // Value
            entry.appendChild(callback());
        }
        return entry;
    }

    createHeader(id) {
        return this.createEntry(id, "header", () => {
            // Divider
            let divider = document.createElement("hr");
            divider.classList.add("divider");
            return divider;
        })
    }

    createChannel(id, colorProvider, itemCallback) {
        return this.createEntry(id, "channel", () => {
            // Row
            let row = document.createElement("div");
            row.classList.add("row");
            {
                // Slider
                let slider = new ColorSliderItem(id, colorProvider);
                slider.initialize(this);
                row.appendChild(slider.getElement());

                // Value
                let field = new NumberItem(id);
                field.initialize(this);
                field.setMax(255);
                row.appendChild(field.getElement());

                itemCallback(slider, field);
            }

            return row;
        })
    }

    loadCurrentPalette() {
        try {
            const saved = window.localStorage.getItem("paintdotjs.colors.currentPalette");
            if (saved !== null) {
                const palette = this.parsePalette(saved);
                if (palette.length > 0) {
                    return palette;
                }
            }
        } catch (_) {
            // Palette persistence is optional in private browsing modes.
        }
        return this.defaultPalette.map(color => color.copy());
    }

    parsePalette(text) {
        const colors = [];
        for (const sourceLine of String(text).split(/\r?\n/)) {
            let line = sourceLine.split(";", 1)[0].trim();
            if (line.startsWith("#")) {
                line = line.substring(1);
            }
            if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(line)) {
                continue;
            }
            let alpha = 255;
            let red;
            let green;
            let blue;
            if (line.length === 8) {
                // Paint.NET palette files use AARRGGBB.
                alpha = parseInt(line.substring(0, 2), 16);
                red = parseInt(line.substring(2, 4), 16);
                green = parseInt(line.substring(4, 6), 16);
                blue = parseInt(line.substring(6, 8), 16);
            } else {
                red = parseInt(line.substring(0, 2), 16);
                green = parseInt(line.substring(2, 4), 16);
                blue = parseInt(line.substring(4, 6), 16);
            }
            colors.push(Color.fromRGBA(red, green, blue, alpha));
            if (colors.length === 96) {
                break;
            }
        }
        if (colors.length === 0) {
            return colors;
        }
        while (colors.length < 96) {
            colors.push(Color.WHITE.copy());
        }
        return colors;
    }

    serializePalette(palette = this.palette) {
        const hex = value => Utility.clamp(Math.round(value), 0, 255)
            .toString(16).padStart(2, "0").toUpperCase();
        return "; paint.net Palette File\n; Colors are written as AARRGGBB.\n"
            + palette.map(color => hex(color.getAlpha()) + hex(color.getRed())
                + hex(color.getGreen()) + hex(color.getBlue())).join("\n") + "\n";
    }

    persistCurrentPalette() {
        try {
            window.localStorage.setItem("paintdotjs.colors.currentPalette", this.serializePalette());
        } catch (_) {
            // Continue with the in-memory palette when storage is unavailable.
        }
    }

    getUserPalettes() {
        try {
            const palettes = JSON.parse(window.localStorage.getItem("paintdotjs.colors.userPalettes") || "{}");
            return palettes !== null && typeof palettes === "object" ? palettes : {};
        } catch (_) {
            return {};
        }
    }

    saveUserPalettes(palettes) {
        try {
            window.localStorage.setItem("paintdotjs.colors.userPalettes", JSON.stringify(palettes));
        } catch (_) {
            // Saving palettes is best-effort in restricted browsing modes.
        }
    }

    setPalette(palette, name = null) {
        if (!Array.isArray(palette) || palette.length === 0) {
            return false;
        }
        this.palette = palette.slice(0, 96).map(color => color.copy());
        while (this.palette.length < 96) {
            this.palette.push(Color.WHITE.copy());
        }
        this.currentPaletteName = name;
        this.persistCurrentPalette();
        this.updatePaletteElements();
        return true;
    }

    updatePaletteElements() {
        for (let i = 0; i < this.paletteElements.length; ++i) {
            const element = this.paletteElements[i];
            element.hidden = i >= this.palette.length;
            if (!element.hidden) {
                element.style.backgroundImage = this.paletteColor(i);
            }
        }
    }

    toggleColorAddMode(force = null) {
        this.colorAddMode = force === null ? !this.colorAddMode : !!force;
        this.colorAddElement.setChecked(this.colorAddMode);
        for (const palette of this.paletteContainers) {
            palette.classList.toggle("color-add-mode", this.colorAddMode);
        }
    }

    onPaletteColorClick(index, button) {
        if (index < 0 || index >= this.palette.length) {
            return;
        }
        if (this.colorAddMode) {
            this.palette[index] = this.getSelectedColor().copy();
            this.currentPaletteName = null;
            this.persistCurrentPalette();
            this.updatePaletteElements();
            this.toggleColorAddMode(false);
            return;
        }
        if (button === MouseButton.RIGHT) {
            this.setNotSelectedColor(this.palette[index].copy(), "palette");
        } else {
            this.setSelectedColor(this.palette[index].copy(), "palette");
        }
    }

    paletteEquals(left, right) {
        return left.length === right.length
            && left.every((color, index) => color.toPacked() === right[index].toPacked());
    }

    createPaletteMenuEntry(id, text, icon, callback, checked = false) {
        const entry = new DropEntry(id, callback);
        entry.getText = () => text;
        entry.getShortcut = () => null;
        if (checked) {
            entry.withIconPathKey("tool_strip_checked", true);
        }
        else if (icon === null) {
            entry.withNoIcon();
        }
        else {
            entry.withIconPathKey(icon, true);
        }
        return entry;
    }

    createRainbowPalette() {
        const palette = [];
        const lightness = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8];
        for (const level of lightness) {
            for (let column = 0; column < 16; ++column) {
                palette.push(Color.fromHSL(column / 16, 1, level));
            }
        }
        return palette;
    }

    createSmallPalette() {
        const palette = this.defaultPalette.slice(0, 32).map(color => color.copy());
        while (palette.length < 96) {
            palette.push(Color.WHITE.copy());
        }
        return palette;
    }

    createPaletteMenuEntries() {
        const entries = [];
        const userPalettes = this.getUserPalettes();
        for (const name of Object.keys(userPalettes).sort((a, b) => a.localeCompare(b))) {
            const palette = this.parsePalette(userPalettes[name]);
            entries.push(this.createPaletteMenuEntry(
                "colors.palette.user." + encodeURIComponent(name),
                name,
                "swatch_icon",
                () => this.setPalette(palette, name),
                this.paletteEquals(this.palette, palette)
            ));
        }
        if (entries.length > 0) {
            entries.push(new VerticalSeparator());
        }
        entries.push(this.createPaletteMenuEntry(
            "colors.palette.saveAs", "Save Current Palette As...", "menu_file_save_as_icon",
            () => this.saveCurrentPaletteAs()
        ));
        entries.push(this.createPaletteMenuEntry(
            "colors.palette.openFolder", "Open Palettes Folder", "menu_file_open_icon",
            () => this.openPalettesFolder()
        ));
        entries.push(new VerticalSeparator());
        entries.push(this.createPaletteMenuEntry(
            "colors.palette.reset", "Reset to Default Palette", "reset_icon",
            () => this.setPalette(this.defaultPalette, null),
            this.paletteEquals(this.palette, this.defaultPalette)
        ));
        entries.push(new VerticalSeparator());
        const rainbowPalette = this.createRainbowPalette();
        entries.push(this.createPaletteMenuEntry(
            "colors.palette.rainbow", "Rainbow", "swatch_icon",
            () => this.setPalette(rainbowPalette, "Rainbow"),
            this.paletteEquals(this.palette, rainbowPalette)
        ));
        const smallPalette = this.createSmallPalette();
        entries.push(this.createPaletteMenuEntry(
            "colors.palette.small", "Small", "swatch_icon",
            () => this.setPalette(smallPalette, "Small"),
            this.paletteEquals(this.palette, smallPalette)
        ));
        return entries;
    }

    async saveCurrentPaletteAs() {
        const preview = document.createElement("div");
        let input = null;
        {
            const label = document.createElement("label");
            label.textContent = "Palette name:";
            {
                input = document.createElement("input");
                input.type = "text";
                input.value = this.currentPaletteName || "My Palette";
                input.style.width = "260px";
                input.style.marginLeft = "10px";
                label.appendChild(input);
            }
            preview.appendChild(label);
        }
        const pending = TaskDialog.show({
            title: "Save Current Palette As",
            icon: "assets/icons/swatch_icon.png",
            preview,
            choices: [
                {title: "Save", value: "save"},
                {title: "Cancel", value: null}
            ]
        });
        setTimeout(() => {
            input.focus();
            input.select();
        });
        if (await pending !== "save") {
            return;
        }
        const name = input.value.trim().replace(/\.txt$/i, "");
        if (name.length === 0) {
            return;
        }
        const palettes = this.getUserPalettes();
        palettes[name] = this.serializePalette();
        this.saveUserPalettes(palettes);
        this.currentPaletteName = name;
    }

    async importPaletteFiles(files) {
        const palettes = this.getUserPalettes();
        let imported = 0;
        for (const file of files) {
            if (!file.name.toLowerCase().endsWith(".txt")) {
                continue;
            }
            const palette = this.parsePalette(await file.text());
            if (palette.length === 0) {
                continue;
            }
            const name = file.name.replace(/\.txt$/i, "") || "Imported Palette";
            palettes[name] = this.serializePalette(palette);
            ++imported;
        }
        if (imported > 0) {
            this.saveUserPalettes(palettes);
        }
        return imported;
    }

    async openPalettesFolder() {
        if (typeof window.showDirectoryPicker === "function") {
            try {
                const directory = await window.showDirectoryPicker({mode: "read"});
                const files = [];
                for await (const handle of directory.values()) {
                    if (handle.kind === "file" && handle.name.toLowerCase().endsWith(".txt")) {
                        files.push(await handle.getFile());
                    }
                }
                await this.importPaletteFiles(files);
            } catch (error) {
                if (error.name !== "AbortError") {
                    throw error;
                }
            }
            return;
        }

        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = ".txt,text/plain";
        picker.multiple = true;
        picker.webkitdirectory = true;
        picker.onchange = async () => {
            const imported = await this.importPaletteFiles(picker.files || []);
            if (imported === 0 && picker.files !== null && picker.files.length > 0) {
                await TaskDialog.show({
                    title: "Open Palettes Folder",
                    icon: "assets/icons/swatch_icon.png",
                    message: "The selected folder does not contain any valid palette files.",
                    choices: [{title: "OK", value: true}]
                });
            }
        };
        picker.click();
    }

    setMainColor(color, initiator = null) {
        if (!(color instanceof Color)) {
            throw new Error("Not a color class");
        }
        if (this.updating) {
            return;
        }

        this.mainColor = color;
        if (typeof AppSettingsStore !== "undefined") {
            AppSettingsStore.set("tools.primaryColor", color.toPacked());
        }
        this.updateElements(initiator);
        this.changed.fire(this, "primary", color.copy());
    }

    setSecondaryColor(color, initiator = null) {
        if (!(color instanceof Color)) {
            throw new Error("Not a color class");
        }
        if (this.updating) {
            return;
        }

        this.secondaryColor = color;
        if (typeof AppSettingsStore !== "undefined") {
            AppSettingsStore.set("tools.secondaryColor", color.toPacked());
        }
        this.updateElements(initiator);
        this.changed.fire(this, "secondary", color.copy());
    }

    getSelectedColor() {
        return this.selectedIsPrimary ? this.mainColor : this.secondaryColor;
    }

    setSelectedColor(color, initiator = null) {
        if (this.selectedIsPrimary) {
            this.setMainColor(color, initiator);
        } else {
            this.setSecondaryColor(color, initiator);
        }
    }

    setNotSelectedColor(color, initiator = null) {
        if (this.selectedIsPrimary) {
            this.setSecondaryColor(color, initiator);
        } else {
            this.setMainColor(color, initiator);
        }
    }

    setSelectedIsPrimary(isPrimary, initiator = null) {
        this.selectedIsPrimary = isPrimary;
        this.updateElements(initiator);
    }

    setExpanded(expanded) {
        this.expanded = !!expanded;
        if (typeof AppSettingsStore !== "undefined") {
            const state = AppSettingsStore.get("windows.colorsForm", {});
            AppSettingsStore.set("windows.colorsForm", Object.assign({}, state, {
                expanded: this.expanded
            }));
        }

        this.updateWindowSize();
        this.updateElements("expand");
    }

    updateWindowSize() {
        if (this.expanded) {
            this.window.setSize(492, 371);
        } else {
            this.window.setSize(270, 315);
        }

        // The Colors window is bottom-anchored. Reapplying its anchor after
        // changing height makes the compact form move down and retain the same
        // bottom edge, matching the desktop application.
        if (typeof this.window.applyAnchor === "function") {
            this.window.applyAnchor();
        }
    }

    updateElements(initiator = null) {
        if (this.updating) {
            return;
        }
        this.updating = true;

        let selectedColor = this.getSelectedColor();
        let isPrimary = this.selectedIsPrimary;

        // Update circle
        if (initiator !== "circle") {
            this.colorCircle.setColor(selectedColor);
        }

        // Update color add item
        this.colorAddElement.setColor(selectedColor);

        // Update selected color indicators
        this.mainColorItem.setColor(this.mainColor);
        this.mainColorItem.setSelected(isPrimary);
        this.secondaryColorItem.setColor(this.secondaryColor);
        this.secondaryColorItem.setSelected(!isPrimary);

        this.moreLessButtonElement.textContent = this.expanded
            ? "<< " + i18n("colorsForm.moreLessButton.text.less")
            : i18n("colorsForm.moreLessButton.text.more") + " >>";
        this.sliderPanel.style.display = this.expanded ? "block" : "none";
        this.extendedPalette.style.display = this.expanded ? "flex" : "none";

        // Update hex field
        if (initiator !== "hex") {
            this.hexField.setText((selectedColor.getRed().toString(16).padStart(2, "0")
                + selectedColor.getGreen().toString(16).padStart(2, "0")
                + selectedColor.getBlue().toString(16).padStart(2, "0"))
                .toUpperCase());
        }

        let isHSVInitiator = initiator === "hueSlider"
            || initiator === "saturationSlider"
            || initiator === "lightnessSlider"
            || initiator === "hueField"
            || initiator === "saturationField"
            || initiator === "lightnessField";

        // Update sliders
        if (initiator !== "redSlider") {
            this.redSlider.setPercentage(selectedColor.getRed() / 255);
        }
        if (initiator !== "greenSlider") {
            this.greenSlider.setPercentage(selectedColor.getGreen() / 255);
        }
        if (initiator !== "blueSlider") {
            this.blueSlider.setPercentage(selectedColor.getBlue() / 255);
        }
        if (isHSVInitiator) {
            // Take the HSV values from the fields, so we are not losing any data when converting back and forth
            if (initiator === "hueField") {
                this.hueSlider.setPercentage(this.hueField.getValue() / 360);
            }
            if (initiator === "saturationField") {
                this.saturationSlider.setPercentage(this.saturationField.getValue() / 100);
            }
            if (initiator === "lightnessField") {
                this.lightnessSlider.setPercentage(this.lightnessField.getValue() / 100);
            }
        } else {
            // Update HSV sliders with the color
            if (initiator !== "hueSlider") {
                this.hueSlider.setPercentage(selectedColor.getHue());
            }
            if (initiator !== "saturationSlider") {
                this.saturationSlider.setPercentage(selectedColor.getSaturation());
            }
            if (initiator !== "lightnessSlider") {
                this.lightnessSlider.setPercentage(selectedColor.getLightness());
            }
        }
        if (initiator !== "alphaSlider") {
            this.alphaSlider.setPercentage(selectedColor.getAlpha() / 255);
        }

        // Update fields
        if (initiator !== "redField") {
            this.redField.setText(selectedColor.getRed());
        }
        if (initiator !== "greenField") {
            this.greenField.setText(selectedColor.getGreen());
        }
        if (initiator !== "blueField") {
            this.blueField.setText(selectedColor.getBlue());
        }
        if (isHSVInitiator) {
            // Take the HSV values from the sliders, so we are not losing any data when converting back and forth
            if (initiator === "hueSlider") {
                this.hueField.setText(Math.floor(this.hueSlider.getPercentage() * 360));
            }
            if (initiator === "saturationSlider") {
                this.saturationField.setText(Math.floor(this.saturationSlider.getPercentage() * 100));
            }
            if (initiator === "lightnessSlider") {
                this.lightnessField.setText(Math.floor(this.lightnessSlider.getPercentage() * 100));
            }
        } else {
            // Update HSV fields with the color
            if (initiator !== "hueField") {
                this.hueField.setText(Math.floor(selectedColor.getHue() * 360));
            }
            if (initiator !== "saturationField") {
                this.saturationField.setText(Math.floor(selectedColor.getSaturation() * 100));
            }
            if (initiator !== "lightnessField") {
                this.lightnessField.setText(Math.floor(selectedColor.getLightness() * 100));
            }
        }
        if (initiator !== "alphaField") {
            this.alphaField.setText(selectedColor.getAlpha());
        }

        this.updating = false;
    }

    paletteColor(index) {
        let color = this.palette[index];
        return "linear-gradient(" + color.copy().setAlpha(255).toHex() + ", " + color.toHex() + ")"
    }
}
