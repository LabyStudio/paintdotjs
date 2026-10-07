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
        if (this.values[section] === undefined) this.values[section] = {};
        this.values[section][property] = value;

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.values));
        } catch (_) {
            // Continue with the in-memory value when persistence is unavailable.
        }

        if (path.startsWith("ui.") || path.startsWith("canvas.")) this.apply();
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
        if (preference !== "default") return preference;
        if (typeof window.matchMedia !== "function") return "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    static watchSystemColorScheme() {
        if (typeof window.matchMedia !== "function" || this.systemColorSchemeQuery !== null) return;

        this.systemColorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.systemColorSchemeQuery.addEventListener("change", () => {
            if (this.get("ui.colorScheme", "default") !== "default") return;

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

class SettingsDialog {

    static open(section = "ui") {
        if (SettingsDialog.instance === null) SettingsDialog.instance = new SettingsDialog();
        SettingsDialog.instance.show(section);
    }

    constructor() {
        this.backdrop = null;
        this.dialog = null;
        this.page = null;
        this.status = null;
        this.dialogMover = null;
        this.activeSection = "ui";
        this.search = null;
        this.shortcutList = null;
        this.fontList = null;
        this.fontAddButton = null;
        this.fontClearButton = null;
        this.fontDropZone = null;
        this.fontImportPanel = null;
        this.fontImportLabel = null;
        this.fontImportBar = null;
        this.fontImportState = null;
        this.fontImporting = false;
        this.fontRenderToken = 0;
        this.fontPreviewObserver = null;
        this.changedListener = () => this.renderShortcutRows();
        this.fontsChangedListener = () => {
            if (this.backdrop !== null && this.activeSection === "fonts") this.renderFontRows();
        };
        window.addEventListener("paintdotjs:fonts-changed", this.fontsChangedListener);
        this.sections = [
            ["ui", "User Interface", "settings_u_i_24.png"],
            ["canvas", "Canvas", "settings_canvas_24.png"],
            ["tools", "Tools", "settings_tools_24.png"],
            ["fonts", "Fonts", "text_tool_icon.png"],
            ["pen", "Pen & Tablet", "settings_pen_and_tablet_24.png"],
            ["graphics", "Graphics", "settings_graphics_24.png"],
            ["colorManagement", "Color Management", "settings_color_management_24.png"],
            ["updates", "Updates", "settings_updates_24.png"],
            ["plugins", "Plugin Errors", "settings_plugins_24.png"],
            ["diagnostics", "Diagnostics", "settings_diagnostics_24.png"],
            ["keyboard", "Keyboard", "menu_utilities_settings_icon.png"]
        ];
    }

    show(section) {
        if (this.backdrop !== null) {
            this.selectSection(section);
            return;
        }

        this.backdrop = document.createElement("div");
        this.backdrop.className = "app-dialog-backdrop settings-dialog-backdrop";
        if (isApp) this.backdrop.classList.add("dialog-backdrop-app");

        this.dialog = document.createElement("section");
        this.dialog.className = "app-dialog settings-dialog";
        this.dialog.setAttribute("role", "dialog");
        this.dialog.setAttribute("aria-modal", "true");
        this.dialog.setAttribute("aria-labelledby", "settings-dialog-title");
        this.dialog.onkeydown = event => {
            if (event.key === "Escape" && !event.target.classList.contains("shortcut-capture")) {
                this.close();
            }
        };

        const titleBar = this.createTitleBar();
        const content = document.createElement("div");
        content.className = "settings-dialog-content";
        content.append(this.createNavigation(), this.createPageHost());

        const footer = document.createElement("footer");
        footer.className = "app-dialog-footer settings-dialog-footer";
        this.status = document.createElement("span");
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Close";
        close.onclick = () => this.close();
        footer.append(this.status, close);

        this.dialog.append(titleBar, content, footer);
        this.backdrop.appendChild(this.dialog);
        document.body.appendChild(this.backdrop);
        this.dialogMover = new DialogMover(this.dialog, titleBar, this.backdrop);
        ActionRegistry.addChangedListener(this.changedListener);
        this.selectSection(section);
        close.focus();
    }

    createTitleBar() {
        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar settings-dialog-title";
        const titleGroup = document.createElement("div");
        titleGroup.className = "app-dialog-title";
        const icon = document.createElement("img");
        icon.src = "assets/icons/menu_utilities_settings_icon.png";
        icon.alt = "";
        const title = document.createElement("strong");
        title.id = "settings-dialog-title";
        title.textContent = "Settings";
        titleGroup.append(icon, title);

        const close = document.createElement("button");
        close.type = "button";
        close.className = "app-dialog-close";
        close.textContent = "×";
        close.title = "Close";
        close.onclick = () => this.close();
        titleBar.append(titleGroup, close);
        return titleBar;
    }

    createNavigation() {
        const navigation = document.createElement("nav");
        navigation.className = "settings-navigation";
        for (const [id, label, iconName, implemented = true] of this.sections) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.section = id;
            button.disabled = !implemented;
            if (!implemented) button.title = "Not implemented yet";
            const icon = document.createElement("img");
            icon.src = "assets/icons/" + iconName;
            icon.alt = "";
            const text = document.createElement("span");
            text.textContent = label;
            button.append(icon, text);
            button.onclick = () => this.selectSection(id);
            navigation.appendChild(button);
        }
        return navigation;
    }

    createPageHost() {
        this.page = document.createElement("main");
        this.page.className = "settings-page";
        return this.page;
    }

    selectSection(section) {
        if (this.page === null) return;
        if (!this.sections.some(([id]) => id === section)) section = "ui";
        this.stopFontRendering();
        this.activeSection = section;
        for (const button of this.dialog.querySelectorAll(".settings-navigation button")) {
            button.classList.toggle("active", button.dataset.section === section);
        }

        this.search = null;
        this.shortcutList = null;
        this.fontList = null;
        this.page.className = "settings-page settings-page-" + section;
        this.page.innerHTML = "";
        const render = this["render" + section[0].toUpperCase() + section.slice(1)];
        render.call(this);
    }

    addHeading(text, description = "") {
        const heading = document.createElement("h2");
        heading.textContent = text;
        this.page.appendChild(heading);
        if (description) {
            const paragraph = document.createElement("p");
            paragraph.textContent = description;
            this.page.appendChild(paragraph);
        }
    }

    addCheckbox(path, label, options = {}) {
        const wrapper = document.createElement("label");
        wrapper.className = "settings-checkbox";
        if (options.disabled) {
            wrapper.classList.add("disabled");
            wrapper.title = options.tooltip || "Not implemented yet";
        }
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = AppSettingsStore.get(path, false);
        input.disabled = Boolean(options.disabled);
        input.onchange = () => AppSettingsStore.set(path, input.checked);
        const text = document.createElement("span");
        text.textContent = label;
        wrapper.append(input, text);
        this.page.appendChild(wrapper);
        if (options.note) this.addNote(options.note);
        return input;
    }

    addSelect(path, label, choices, options = {}) {
        const row = document.createElement("label");
        row.className = "settings-field-row";
        if (options.disabled) {
            row.classList.add("disabled");
            row.title = options.tooltip || "Not implemented yet";
        }
        const text = document.createElement("span");
        text.textContent = label;
        const select = document.createElement("select");
        select.disabled = Boolean(options.disabled);
        for (const [value, name] of choices) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = name;
            select.appendChild(option);
        }
        select.value = AppSettingsStore.get(path, choices[0][0]);
        select.onchange = () => AppSettingsStore.set(path, select.value);
        row.append(text, select);
        this.page.appendChild(row);
        if (options.note) this.addNote(options.note);
        return select;
    }

    addNote(text) {
        const note = document.createElement("p");
        note.className = "settings-note";
        note.textContent = text;
        this.page.appendChild(note);
        return note;
    }

    addSectionHeading(text) {
        const heading = document.createElement("h3");
        heading.className = "settings-section-heading";
        heading.textContent = text;
        this.page.appendChild(heading);
    }

    addButton(label, callback, options = {}) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "settings-action-button";
        button.textContent = label;
        button.disabled = Boolean(options.disabled);
        if (options.disabled) button.title = options.tooltip || "Not implemented yet";
        button.onclick = callback;
        this.page.appendChild(button);
        return button;
    }

    renderUi() {
        this.addHeading("User Interface");
        this.addCheckbox("ui.animations", "Animations");
        this.addCheckbox("ui.translucentWindows", "Translucent windows");
        this.addCheckbox("ui.overscroll", "Scrolling past the edge of the image (overscroll)");
        this.addCheckbox("ui.autoScrollWhileDrawing", "Auto-scroll when drawing at the edge of the window");
        this.addCheckbox("ui.autoSelectVisibleLayer", "Auto-select nearest visible layer after hiding a layer");
        this.addSelect("ui.colorScheme", "Color Scheme:", [
            ["default", "Default (system)"], ["blue", "Blue"], ["light", "Light"], ["dark", "Dark"]
        ]);
        const languages = [["auto", "Automatic (browser language)"],
            ...Object.entries(Language.options).map(([code, name]) => [code, name])];
        const language = this.addSelect("ui.language", "Language:", languages);
        const languageNote = this.addNote(
            "Language changes are applied after reloading paint.js. Missing translations fall back to English."
        );
        const reload = this.addButton("Reload now", () => window.location.reload(), {
            disabled: language.value === Language.preference,
            tooltip: "Select a different language first"
        });
        const updateLanguageState = () => {
            const pending = language.value !== Language.preference;
            reload.disabled = !pending;
            reload.title = pending ? "Reload paint.js and apply the selected language" :
                "Select a different language first";
            languageNote.textContent = pending
                ? "Language change pending. Reload paint.js to apply it."
                : "Language changes are applied after reloading paint.js. Missing translations fall back to English.";
            if (pending) this.setStatus("Reload paint.js to apply the selected language.");
        };
        language.onchange = () => {
            AppSettingsStore.set("ui.language", language.value);
            updateLanguageState();
        };
        updateLanguageState();
    }

    renderCanvas() {
        this.addCheckbox("canvas.dropShadow", "Draw a shadow around the canvas");
        const customBorder = this.addCheckbox("canvas.customBorder", "Use a custom color for the canvas border");

        const colorEditor = document.createElement("div");
        colorEditor.className = "settings-canvas-color-editor";

        const color = document.createElement("input");
        color.type = "color";
        color.className = "settings-canvas-color-swatch";
        color.title = "Canvas border color";
        color.value = AppSettingsStore.get("canvas.borderColor", "#808080");
        colorEditor.appendChild(color);

        const wheel = document.createElement("div");
        wheel.className = "settings-canvas-color-wheel";
        wheel.title = "Choose hue and saturation";
        const wheelCursor = document.createElement("span");
        wheel.appendChild(wheelCursor);
        colorEditor.appendChild(wheel);

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

        const rgbPanel = document.createElement("div");
        rgbPanel.className = "settings-canvas-rgb";
        const rgbInputs = {};
        for (const [channel, label] of [["red", "R:"], ["green", "G:"], ["blue", "B:"]]) {
            const row = document.createElement("label");
            const text = document.createElement("span");
            text.textContent = label;
            const input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.max = "255";
            input.step = "1";
            rgbInputs[channel] = input;
            row.append(text, NumberInput.wrap(input));
            rgbPanel.appendChild(row);
        }
        const resetColor = document.createElement("button");
        resetColor.type = "button";
        resetColor.className = "settings-inline-reset";
        resetColor.title = "Reset";
        const resetColorIcon = document.createElement("img");
        resetColorIcon.src = "assets/icons/reset_icon.png";
        resetColorIcon.alt = "Reset";
        resetColor.appendChild(resetColorIcon);
        rgbPanel.appendChild(resetColor);
        colorEditor.appendChild(rgbPanel);
        this.page.appendChild(colorEditor);

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
            if (save) AppSettingsStore.set("canvas.borderColor", color.value);
        };
        const updateFromRgb = () => {
            const clampChannel = channel => Math.max(0, Math.min(255, Number(rgbInputs[channel].value) || 0));
            const selected = Color.fromRGB(clampChannel("red"), clampChannel("green"), clampChannel("blue"));
            updateColorControls(selected.toHex(), true);
        };
        color.oninput = () => updateColorControls(color.value, true);
        for (const input of Object.values(rgbInputs)) input.oninput = updateFromRgb;
        valueBar.oninput = () => {
            const selected = readColor();
            updateColorControls(Color.fromHSL(selected.getHue(), selected.getSaturation(),
                Number(valueBar.value) / 255).toHex(), true);
        };
        wheel.onpointerdown = event => {
            if (!customBorder.checked) return;
            const bounds = wheel.getBoundingClientRect();
            const x = event.clientX - bounds.left - bounds.width / 2;
            const y = event.clientY - bounds.top - bounds.height / 2;
            const saturation = Math.min(1, Math.hypot(x, y) / (bounds.width / 2));
            let hue = Math.atan2(y, x) / (Math.PI * 2);
            if (hue < 0) hue += 1;
            const current = readColor();
            updateColorControls(Color.fromHSL(hue, saturation, current.getLightness()).toHex(), true);
        };
        resetColor.onclick = () => updateColorControls("#808080", true);
        updateColorControls(color.value, false);

        const updateColorEditorState = () => {
            const disabled = !customBorder.checked;
            colorEditor.classList.toggle("disabled", disabled);
            colorEditor.setAttribute("aria-disabled", String(disabled));
            color.disabled = disabled;
            valueBar.disabled = disabled;
            resetColor.disabled = disabled;
            for (const input of Object.values(rgbInputs)) input.disabled = disabled;
        };
        customBorder.onchange = () => {
            AppSettingsStore.set("canvas.customBorder", customBorder.checked);
            updateColorEditorState();
        };
        updateColorEditorState();

        const brightnessGroup = document.createElement("div");
        brightnessGroup.className = "settings-canvas-brightness";
        const brightnessLabel = document.createElement("span");
        brightnessLabel.textContent = "Transparency Checkerboard Brightness";
        brightnessGroup.appendChild(brightnessLabel);
        const brightnessRow = document.createElement("div");
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
        const resetBrightness = document.createElement("button");
        resetBrightness.type = "button";
        resetBrightness.className = "settings-inline-reset";
        resetBrightness.title = "Reset";
        const resetBrightnessIcon = document.createElement("img");
        resetBrightnessIcon.src = "assets/icons/reset_icon.png";
        resetBrightnessIcon.alt = "Reset";
        resetBrightness.appendChild(resetBrightnessIcon);
        const setBrightness = value => {
            const normalized = Math.max(0.25, Math.min(1, Number(value) || 0.75));
            range.value = String(normalized);
            output.value = normalized.toFixed(2);
            AppSettingsStore.set("canvas.checkerboardBrightness", Math.round(normalized * 100));
        };
        range.oninput = () => setBrightness(range.value);
        output.onchange = () => setBrightness(output.value);
        resetBrightness.onclick = () => setBrightness(0.75);
        brightnessRow.append(range, NumberInput.wrap(output), resetBrightness);
        brightnessGroup.appendChild(brightnessRow);
        this.page.appendChild(brightnessGroup);
    }

    renderTools() {
        this.addHeading("Tools", "Choose the defaults that are used when paint.js starts.");
        const choices = ToolType.VALUES.map(type => [type.getId(), type.getName()]);
        this.addSelect("tools.defaultTool", "Default tool:", choices);
        this.addSectionHeading("Tool defaults");
        this.addNote("Tool-specific options are saved automatically as you use them.");
        this.addButton("Reset tool settings", () => {
            for (const type of ToolType.VALUES) type.resetSettings();
            this.setStatus("Tool settings were reset to their defaults.");
            const active = window.app?.getActiveTool?.();
            if (active !== null && active !== undefined) window.app.setActiveToolFromType(active.getType());
        });
    }

    renderPen() {
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

    renderGraphics() {
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

    renderColorManagement() {
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

    renderUpdates() {
        this.addHeading("Updates");
        this.addCheckbox("updates.automatic", "Automatically check for updates", {
            disabled: true,
            note: isApp ? "Desktop releases check automatically shortly after startup." :
                "The installed web app checks automatically while it is open."
        });
        this.addCheckbox("updates.prerelease", "Also check for pre-release versions", {
            disabled: true,
            note: "Pre-release update channels are not enabled."
        });
        let checkButton = null;
        checkButton = this.addButton("Check now", () => this.checkForUpdates(checkButton));
        if (!isApp) {
            this.addNote("Clears the paint.js offline cache and reloads the latest web version.");
        }
    }

    async checkForUpdates(button) {
        if (isApp) {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Checking...";
            this.setStatus("Checking GitHub Releases for a newer desktop version...");
            try {
                const result = await window.desktopUpdater.check();
                if (!result.supported) {
                    this.setStatus("Updates for this installation are managed by your package manager.");
                } else if (result.version && result.version !== window.PDJVERSION) {
                    this.setStatus(`Downloading paint.js ${result.version} in the background...`);
                } else {
                    this.setStatus("You are using the latest version of paint.js.");
                }
            } catch (error) {
                console.error("Could not check for desktop updates", error);
                this.setStatus("The update check failed. Please try again later.");
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
            return;
        }

        if (window.app?.hasUnsavedDocuments?.()) {
            const choice = await TaskDialog.show({
                title: "Update paint.js",
                icon: "assets/icons/settings_updates_24.png",
                message: "Reloading will close the current documents. Save your changes before continuing.",
                cancelValue: "cancel",
                choices: [
                    {
                        value: "reload",
                        title: "Update and reload",
                        description: "Continue after you have saved everything.",
                        icon: "assets/icons/settings_updates_24.png"
                    },
                    {
                        value: "cancel",
                        title: "Cancel",
                        description: "Return to paint.js without clearing anything.",
                        icon: "assets/icons/menu_edit_undo_icon.png"
                    }
                ]
            });
            if (choice !== "reload") return;
        }

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Checking...";
        this.setStatus("Clearing the offline cache and checking for updates...");

        try {
            const appScope = new URL("./", document.baseURI).href;
            if ("serviceWorker" in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                const appRegistrations = registrations.filter(registration => registration.scope === appScope);
                await Promise.all(appRegistrations.map(registration => registration.unregister()));
            }

            if ("caches" in window) {
                const cacheNames = await caches.keys();
                const appCacheNames = cacheNames.filter(name => name.toLowerCase().includes("paintdotjs"));
                await Promise.all(appCacheNames.map(name => caches.delete(name)));
            }

            const reloadUrl = new URL(window.location.href);
            reloadUrl.searchParams.set("v", Date.now().toString());
            window.location.replace(reloadUrl.href);
        } catch (error) {
            console.error("Could not refresh paint.js", error);
            button.disabled = false;
            button.textContent = originalText;
            this.setStatus("Could not clear the offline cache. Please try again.");
        }
    }

    renderPlugins() {
        this.addHeading("Plugin Errors");
        this.addNote("No plugin errors were found.");
        const empty = document.createElement("div");
        empty.className = "settings-empty-list";
        empty.textContent = "paint.js does not currently load native Paint.NET plugins.";
        this.page.appendChild(empty);
    }

    renderFonts() {
        this.addHeading("Fonts", "Add fonts for the Text tool. Font files are stored locally in this app and are not uploaded.");

        const controls = document.createElement("div");
        controls.className = "settings-font-controls";
        const input = document.createElement("input");
        input.type = "file";
        input.accept = FontManager.getAcceptedFileTypes();
        input.multiple = true;
        input.hidden = true;
        input.onchange = async () => {
            await this.importFonts(Array.from(input.files || []));
            input.value = "";
        };
        const add = document.createElement("button");
        add.type = "button";
        add.className = "settings-action-button";
        add.textContent = "Add fonts…";
        add.onclick = () => input.click();
        this.fontAddButton = add;
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "settings-action-button settings-font-clear";
        clear.textContent = "Clear all";
        clear.onclick = () => this.clearAllFonts();
        this.fontClearButton = clear;
        controls.append(add, clear, input);
        this.page.appendChild(controls);

        const dropZone = document.createElement("div");
        dropZone.className = "settings-font-drop-zone";
        dropZone.tabIndex = 0;
        dropZone.textContent = "Drop .ttf, .otf, .woff, or .woff2 files here";
        dropZone.ondragenter = dropZone.ondragover = event => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add("drag-over");
            if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "copy";
        };
        dropZone.ondragleave = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove("drag-over");
        };
        dropZone.ondrop = async event => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove("drag-over");
            await this.importFonts(Array.from(event.dataTransfer?.files || []));
        };
        this.fontDropZone = dropZone;
        this.page.appendChild(dropZone);

        const progressPanel = document.createElement("div");
        progressPanel.className = "settings-font-import-progress";
        progressPanel.setAttribute("role", "status");
        progressPanel.setAttribute("aria-live", "polite");
        const spinner = document.createElement("span");
        spinner.className = "settings-font-import-spinner";
        spinner.setAttribute("aria-hidden", "true");
        const progressBody = document.createElement("div");
        const progressLabel = document.createElement("span");
        const progress = document.createElement("progress");
        progress.max = 1;
        progress.value = 0;
        progressBody.append(progressLabel, progress);
        progressPanel.append(spinner, progressBody);
        this.page.appendChild(progressPanel);
        this.fontImportPanel = progressPanel;
        this.fontImportLabel = progressLabel;
        this.fontImportBar = progress;
        this.updateFontImportProgress();

        this.addSectionHeading("Installed by you");
        this.fontList = document.createElement("div");
        this.fontList.className = "settings-font-list";
        this.page.appendChild(this.fontList);
        FontManager.initialize().then(() => this.renderFontRows());
        this.renderFontRows();
    }

    async importFonts(files) {
        const fontFiles = files.filter(file => FontManager.isFontFile(file));
        if (fontFiles.length === 0) {
            this.setStatus("Choose a TTF, OTF, WOFF, or WOFF2 font file.");
            return null;
        }
        if (this.fontImporting) {
            this.setStatus("Wait for the current font import to finish.");
            return null;
        }
        this.fontImporting = true;
        this.fontImportState = {completed: 0, total: fontFiles.length, file: null, phase: "preparing"};
        this.updateFontImportProgress();
        this.setStatus(`Preparing to add ${fontFiles.length} font${fontFiles.length === 1 ? "" : "s"}…`);
        try {
            const result = await FontManager.importFiles(fontFiles, state => {
                this.fontImportState = state;
                this.updateFontImportProgress();
                if (state.phase === "adding") {
                    this.setStatus(`Adding font ${state.completed + 1} of ${state.total}: ${state.file.name}`);
                }
            });
            if (result.errors.length > 0) {
                const details = result.errors.map(item =>
                    `${item.file.name}: ${item.error.message}`).join("\n");
                this.setStatus(`Added ${result.added.length}; ${result.errors.length} could not be added.`);
                alert("Some fonts could not be added:\n\n" + details);
            } else {
                this.setStatus(result.added.length === 1
                    ? `Added ${result.added[0].name}.`
                    : `Added ${result.added.length} fonts.`);
            }
            this.renderFontRows();
            return result;
        } finally {
            this.fontImporting = false;
            this.fontImportState = null;
            this.updateFontImportProgress();
        }
    }

    updateFontImportProgress() {
        const state = this.fontImportState;
        if (this.fontAddButton !== null) this.fontAddButton.disabled = this.fontImporting;
        if (this.fontClearButton !== null) {
            this.fontClearButton.disabled = this.fontImporting
                || FontManager.isInitializing() || FontManager.getFonts().length === 0;
        }
        if (this.fontDropZone !== null) {
            this.fontDropZone.classList.toggle("busy", this.fontImporting);
            this.fontDropZone.setAttribute("aria-busy", String(this.fontImporting));
        }
        if (this.fontImportPanel === null) return;
        this.fontImportPanel.hidden = state === null;
        if (state === null) return;

        this.fontImportBar.max = Math.max(1, state.total);
        this.fontImportBar.value = state.completed;
        this.fontImportLabel.textContent = state.file === null
            ? `Preparing ${state.total} font${state.total === 1 ? "" : "s"}…`
            : `Adding ${state.completed + (state.phase === "adding" ? 1 : 0)} of ${state.total}: ${state.file.name}`;
    }

    renderFontRows() {
        if (this.fontList === null || !this.fontList.isConnected) return;
        this.stopFontRendering();
        this.fontList.innerHTML = "";
        const fonts = FontManager.getFonts();
        if (this.fontClearButton !== null) {
            this.fontClearButton.disabled = this.fontImporting
                || FontManager.isInitializing() || fonts.length === 0;
        }
        if (fonts.length === 0) {
            const empty = document.createElement("div");
            empty.className = "settings-empty-list settings-font-empty";
            empty.textContent = FontManager.isInitializing()
                ? "Loading installed fonts…"
                : "No custom fonts have been added.";
            this.fontList.appendChild(empty);
            return;
        }

        const token = ++this.fontRenderToken;
        this.fontPreviewObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const preview = entry.target;
                this.fontPreviewObserver?.unobserve(preview);
                FontManager.ensureLoaded(preview.dataset.fontId).then(face => {
                    if (face !== null && preview.isConnected && token === this.fontRenderToken) {
                        preview.style.fontFamily = `'${face.family.replace(/'/g, "\\'")}', sans-serif`;
                    }
                }).catch(error => {
                    console.warn(`Could not load font preview "${preview.dataset.fontName}"`, error);
                });
            }
        }, {root: this.page, rootMargin: "160px"});

        let index = 0;
        const appendChunk = () => {
            if (token !== this.fontRenderToken || this.fontList === null
                || !this.fontList.isConnected) return;
            const fragment = document.createDocumentFragment();
            const end = Math.min(index + 20, fonts.length);
            for (; index < end; ++index) fragment.appendChild(this.createFontRow(fonts[index]));
            this.fontList.appendChild(fragment);
            if (index < fonts.length) requestAnimationFrame(appendChunk);
        };
        appendChunk();
    }

    createFontRow(font) {
        const row = document.createElement("article");
        row.className = "settings-font-row";
        const details = document.createElement("div");
        details.className = "settings-font-details";
        const name = document.createElement("strong");
        name.textContent = font.name;
        const metadata = document.createElement("span");
        metadata.textContent = `${font.fileName} · ${this.formatFileSize(font.size)}`;
        details.append(name, metadata);

        const preview = document.createElement("div");
        preview.className = "settings-font-preview";
        preview.dataset.fontId = font.id;
        preview.dataset.fontName = font.name;
        preview.textContent = "The quick brown fox jumps over the lazy dog 0123456789";
        this.fontPreviewObserver?.observe(preview);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "settings-font-remove";
        remove.textContent = "Remove";
        remove.onclick = async () => {
            remove.disabled = true;
            try {
                await FontManager.removeFont(font.id);
                this.setStatus(`Removed ${font.name}.`);
            } catch (error) {
                remove.disabled = false;
                this.setStatus(`Could not remove ${font.name}.`);
                alert(`Could not remove "${font.name}": ${error.message}`);
            }
        };
        row.append(details, preview, remove);
        return row;
    }

    stopFontRendering() {
        ++this.fontRenderToken;
        this.fontPreviewObserver?.disconnect();
        this.fontPreviewObserver = null;
    }

    async clearAllFonts() {
        const count = FontManager.getFonts().length;
        if (count === 0 || this.fontImporting || FontManager.isInitializing()) return;
        const choice = await TaskDialog.show({
            title: "Clear Installed Fonts",
            icon: "assets/icons/warning_icon.png",
            message: `Remove all ${count} custom fonts from paint.js? This cannot be undone.`,
            cancelValue: "cancel",
            choices: [
                {
                    value: "clear",
                    title: "Clear All Fonts",
                    description: "Delete every custom font stored by paint.js.",
                    icon: "assets/icons/trash_can.png"
                },
                {
                    value: "cancel",
                    title: "Cancel",
                    description: "Keep the installed fonts.",
                    icon: "assets/icons/cancel_icon.png"
                }
            ]
        });
        if (choice !== "clear") return;

        this.fontClearButton.disabled = true;
        this.setStatus(`Removing ${count} fonts…`);
        try {
            const removed = await FontManager.removeAllFonts();
            this.setStatus(`Removed ${removed} custom fonts.`);
        } catch (error) {
            console.error("Could not clear custom fonts", error);
            this.setStatus("Could not clear the custom fonts.");
            this.fontClearButton.disabled = false;
        }
    }

    formatFileSize(size) {
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
        return (size / (1024 * 1024)).toFixed(1) + " MB";
    }

    renderDiagnostics() {
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
        for (const [key, value] of diagnostics) {
            const keyCell = document.createElement("span");
            keyCell.textContent = key;
            const valueCell = document.createElement("span");
            valueCell.textContent = value;
            table.append(keyCell, valueCell);
        }
        this.page.appendChild(table);
        this.addButton("Copy to clipboard", async () => {
            await navigator.clipboard.writeText(diagnostics.map(row => row.join(": ")).join("\n"));
            this.setStatus("Diagnostics copied to the clipboard.");
        });
    }

    renderKeyboard() {
        this.addHeading("Keyboard shortcuts",
            "Select a shortcut field and press a key combination. Delete clears the selected shortcut.");
        this.search = document.createElement("input");
        this.search.type = "search";
        this.search.placeholder = "Search actions";
        this.search.className = "shortcut-settings-search";
        this.search.oninput = () => this.renderShortcutRows();
        this.shortcutList = document.createElement("div");
        this.shortcutList.className = "shortcut-settings-list";
        const reset = this.addButton("Reset all shortcuts", () => {
            ActionRegistry.resetAllShortcuts();
            this.setStatus("All shortcuts were reset to their defaults.");
        });
        reset.classList.add("settings-reset-shortcuts");
        this.page.insertBefore(this.search, reset);
        this.page.insertBefore(this.shortcutList, reset);
        this.renderShortcutRows();
        this.search.focus();
    }

    renderShortcutRows() {
        if (this.shortcutList === null) return;
        const query = this.search?.value.trim().toLowerCase() || "";
        const actions = ActionRegistry.getActionList()
            .map(action => ({action, name: String(action.getDisplayName()).split("\n")[0]}))
            .filter(entry => !query
                || entry.name.toLowerCase().includes(query)
                || entry.action.getActionId().toLowerCase().includes(query)
                || entry.action.getCategory().toLowerCase().includes(query))
            .sort((a, b) => a.action.getCategory().localeCompare(b.action.getCategory())
                || a.name.localeCompare(b.name));

        this.shortcutList.innerHTML = "";
        let previousCategory = null;
        for (const entry of actions) {
            const category = entry.action.getCategory();
            if (category !== previousCategory) {
                const heading = document.createElement("h3");
                heading.textContent = category;
                this.shortcutList.appendChild(heading);
                previousCategory = category;
            }
            this.shortcutList.appendChild(this.createShortcutRow(entry.action, entry.name));
        }
    }

    createShortcutRow(action, name) {
        const row = document.createElement("div");
        row.className = "shortcut-settings-row";
        const label = document.createElement("label");
        label.textContent = name;
        label.title = action.getActionId();
        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.className = "shortcut-capture";
        input.value = action.getShortcutKey().toString() || "Not assigned";
        input.onfocus = () => {
            input.value = "Press shortcut…";
            input.select();
        };
        input.onblur = () => input.value = action.getShortcutKey().toString() || "Not assigned";
        input.onkeydown = event => {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Escape") return input.blur();
            if (event.key === "Backspace" || event.key === "Delete") {
                ActionRegistry.setShortcut(action.getActionId(), null);
                return this.setStatus("Shortcut cleared for " + name + ".");
            }
            const shortcut = ShortcutKey.fromEvent(event);
            if (!shortcut.isEmpty()) ActionRegistry.setShortcut(action.getActionId(), shortcut);
        };
        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Reset";
        reset.disabled = action.getShortcutKey().equals(action.getDefaultShortcutKey());
        reset.onclick = () => ActionRegistry.resetShortcut(action.getActionId());
        row.append(label, input, reset);
        return row;
    }

    isWebGlAvailable() {
        try {
            const canvas = document.createElement("canvas");
            return canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null;
        } catch (_) {
            return false;
        }
    }

    setStatus(message) {
        if (this.status !== null) this.status.textContent = message;
    }

    close() {
        if (this.backdrop === null) return;
        this.stopFontRendering();
        ActionRegistry.removeChangedListener(this.changedListener);
        if (this.dialogMover !== null) this.dialogMover.destroy();
        this.backdrop.remove();
        this.backdrop = null;
        this.dialog = null;
        this.page = null;
        this.status = null;
        this.search = null;
        this.shortcutList = null;
        this.fontList = null;
        this.fontAddButton = null;
        this.fontClearButton = null;
        this.fontDropZone = null;
        this.fontImportPanel = null;
        this.fontImportLabel = null;
        this.fontImportBar = null;
        this.dialogMover = null;
    }
}

SettingsDialog.instance = null;
AppSettingsStore.apply();
AppSettingsStore.watchSystemColorScheme();
