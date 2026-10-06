class AppSettingsStore {

    static storageKey = "paintdotjs.settings.v1";
    static systemColorSchemeQuery = null;

    static defaults = {
        ui: {
            animations: true,
            translucentWindows: true,
            overscroll: true,
            autoScrollWhileDrawing: false,
            autoSelectVisibleLayer: false,
            colorScheme: "default",
            language: "auto"
        },
        canvas: {
            dropShadow: true,
            customBorder: false,
            borderColor: "#808080",
            checkerboardBrightness: 100
        },
        tools: {defaultTool: "paintBrushTool"},
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

        this.apply();
        if (path.startsWith("canvas.") && window.app !== undefined) {
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
        root.style.setProperty("--checkerboard-brightness",
            String(this.get("canvas.checkerboardBrightness", 100) / 100));

        const view = document.getElementById("view");
        if (view !== null) {
            view.style.overscrollBehavior = this.get("ui.overscroll", true) ? "auto" : "none";
        }
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
        this.changedListener = () => this.renderShortcutRows();
        this.sections = [
            ["ui", "User Interface", "settings_u_i_24.png"],
            ["canvas", "Canvas", "settings_canvas_24.png"],
            ["tools", "Tools", "settings_tools_24.png"],
            ["pen", "Pen & Tablet", "settings_pen_and_tablet_24.png"],
            ["graphics", "Graphics", "settings_graphics_24.png"],
            ["colorManagement", "Color Management", "settings_color_management_24.png"],
            ["updates", "Updates", "settings_updates_24.png"],
            ["plugins", "Plugin Errors", "settings_plugins_24.png", false],
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
        this.activeSection = section;
        for (const button of this.dialog.querySelectorAll(".settings-navigation button")) {
            button.classList.toggle("active", button.dataset.section === section);
        }

        this.search = null;
        this.shortcutList = null;
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
        this.addHeading("Canvas");
        this.addCheckbox("canvas.dropShadow", "Draw a drop shadow around the image");
        const customBorder = this.addCheckbox("canvas.customBorder", "Use a custom color for the image border");

        const colorRow = document.createElement("label");
        colorRow.className = "settings-field-row settings-color-row";
        const colorLabel = document.createElement("span");
        colorLabel.textContent = "Border color:";
        const color = document.createElement("input");
        color.type = "color";
        color.value = AppSettingsStore.get("canvas.borderColor", "#808080");
        color.disabled = !customBorder.checked;
        colorRow.classList.toggle("disabled", color.disabled);
        color.oninput = () => AppSettingsStore.set("canvas.borderColor", color.value);
        customBorder.onchange = () => {
            AppSettingsStore.set("canvas.customBorder", customBorder.checked);
            color.disabled = !customBorder.checked;
            colorRow.classList.toggle("disabled", color.disabled);
        };
        colorRow.append(colorLabel, color);
        this.page.appendChild(colorRow);

        const brightnessRow = document.createElement("label");
        brightnessRow.className = "settings-slider-row";
        const brightnessLabel = document.createElement("span");
        brightnessLabel.textContent = "Transparency checkerboard brightness:";
        const range = document.createElement("input");
        range.type = "range";
        range.min = "35";
        range.max = "100";
        range.value = String(AppSettingsStore.get("canvas.checkerboardBrightness", 100));
        const output = document.createElement("output");
        output.textContent = range.value + "%";
        range.oninput = () => {
            output.textContent = range.value + "%";
            AppSettingsStore.set("canvas.checkerboardBrightness", Number(range.value));
        };
        brightnessRow.append(brightnessLabel, range, output);
        this.page.appendChild(brightnessRow);
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
        this.addCheckbox("updates.automatic", "Automatically check for updates", {disabled: true});
        this.addCheckbox("updates.prerelease", "Also check for pre-release versions", {
            disabled: true,
            note: "Automatic update checks are not implemented yet."
        });
        let checkButton = null;
        checkButton = this.addButton("Check now", () => this.checkForUpdates(checkButton));
        if (!isApp) {
            this.addNote("Clears the paint.js offline cache and reloads the latest web version.");
        }
    }

    async checkForUpdates(button) {
        if (isApp) {
            window.open("https://github.com/LabyStudio/paintdotjs/releases", "_blank", "noopener");
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
        ActionRegistry.removeChangedListener(this.changedListener);
        if (this.dialogMover !== null) this.dialogMover.destroy();
        this.backdrop.remove();
        this.backdrop = null;
        this.dialog = null;
        this.page = null;
        this.status = null;
        this.search = null;
        this.shortcutList = null;
        this.dialogMover = null;
    }
}

SettingsDialog.instance = null;
AppSettingsStore.apply();
AppSettingsStore.watchSystemColorScheme();
