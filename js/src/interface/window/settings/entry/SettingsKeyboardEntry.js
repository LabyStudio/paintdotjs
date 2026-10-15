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

class SettingsKeyboardEntry extends SettingsEntry {

    render() {
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
        if (this.shortcutList === null) {
            return;
        }
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
        {
            // Action label
            const label = document.createElement("label");
            label.textContent = name;
            label.title = action.getActionId();

            // Shortcut input
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
                if (event.key === "Escape") {
                    return input.blur();
                }
                if (event.key === "Backspace" || event.key === "Delete") {
                    ActionRegistry.setShortcut(action.getActionId(), null);
                    return this.setStatus("Shortcut cleared for " + name + ".");
                }
                const shortcut = ShortcutKey.fromEvent(event);
                if (!shortcut.isEmpty()) {
                    ActionRegistry.setShortcut(action.getActionId(), shortcut);
                }
            };

            // Reset button
            const reset = document.createElement("button");
            reset.type = "button";
            reset.textContent = "Reset";
            reset.disabled = action.getShortcutKey().equals(action.getDefaultShortcutKey());
            reset.onclick = () => ActionRegistry.resetShortcut(action.getActionId());
            row.append(label, input, reset);
        }
        return row;
    }
}
