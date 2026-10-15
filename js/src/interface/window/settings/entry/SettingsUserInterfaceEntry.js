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

class SettingsUserInterfaceEntry extends SettingsEntry {

    render() {
        this.addHeading("User Interface");
        this.addCheckbox("ui.animations", "Animations");
        this.addCheckbox("ui.translucentWindows", "Translucent windows");
        this.addCheckbox("ui.overscroll", "Scrolling past the edge of the image (overscroll)");
        this.addCheckbox("ui.autoScrollWhileDrawing", "Auto-scroll when drawing at the edge of the window");
        this.addCheckbox("ui.autoSelectVisibleLayer", "Auto-select nearest visible layer after hiding a layer");
        this.addSelect("ui.colorScheme", "Color Scheme:", [
            ["default", "Default (system)"], ["blue", "Blue"], ["light", "Light"], ["dark", "Dark"]
        ]);
        this.uiAssetPackSelect = this.addSelect(null, "Icon pack:",
            this.getUiAssetPackChoices(), {
                value: AssetPackManager.getActivePackId(),
                onChange: async (value, select) => {
                    select.disabled = true;
                    try {
                        await AssetPackManager.activate(value);
                        this.setStatus("Icon pack changed. Reload to apply included translations.");
                    } catch (error) {
                        console.error("Could not activate icon pack", error);
                        this.setStatus("Could not activate the selected icon pack.");
                    } finally {
                        this.updateUiAssetPackSelect();
                    }
                }
            });
        this.uiFontSelect = this.addSelect("ui.fontFamily", "UI font:",
            FontManager.getTextToolChoices(), {
                onChange: value => {
                    AppSettingsStore.set("ui.fontFamily", value);
                    this.setStatus("UI font changed.");
                }
            });
        void FontManager.initialize().then(() => this.updateUiFontSelect());
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
            if (pending) {
                this.setStatus("Reload paint.js to apply the selected language.");
            }
        };
        language.onchange = () => {
            AppSettingsStore.set("ui.language", language.value);
            AssetPackManager.prepareLanguage(language.value);
            updateLanguageState();
        };
        updateLanguageState();
    }

    getUiAssetPackChoices() {
        return AssetPackManager.getPacks().map(pack => [pack.id, pack.name]);
    }

    updateUiAssetPackSelect() {
        if (this.uiAssetPackSelect === null || !this.uiAssetPackSelect.isConnected) {
            return;
        }
        this.replaceSelectOptions(this.uiAssetPackSelect, this.getUiAssetPackChoices(),
            AssetPackManager.getActivePackId());
        this.uiAssetPackSelect.disabled = false;
    }

    updateUiFontSelect() {
        if (this.uiFontSelect === null || !this.uiFontSelect.isConnected) {
            return;
        }
        const selected = AppSettingsStore.get("ui.fontFamily", "Noto Sans");
        const choices = FontManager.getTextToolChoices();
        const available = choices.some(([value]) => value === selected);
        this.replaceSelectOptions(this.uiFontSelect, choices, available ? selected : "Noto Sans");
    }

    replaceSelectOptions(select, choices, selected) {
        select.innerHTML = "";
        for (const [value, name] of choices) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = name;
            select.appendChild(option);
        }
        select.value = selected;
    }
}
