class ShortcutSettingsDialog {

    static open() {
        if (ShortcutSettingsDialog.instance === undefined) {
            ShortcutSettingsDialog.instance = new ShortcutSettingsDialog();
        }
        ShortcutSettingsDialog.instance.show();
    }

    constructor() {
        this.backdrop = null;
        this.list = null;
        this.search = null;
        this.status = null;
        this.changedListener = () => this.renderRows();
    }

    show() {
        if (this.backdrop !== null) return;

        this.backdrop = document.createElement("div");
        this.backdrop.className = "shortcut-settings-backdrop";
        this.backdrop.onclick = event => {
            if (event.target === this.backdrop) this.close();
        };

        const dialog = document.createElement("section");
        dialog.className = "shortcut-settings-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-label", "Settings");
        dialog.onkeydown = event => {
            if (event.key === "Escape" && document.activeElement !== this.search) this.close();
        };

        const titleBar = document.createElement("header");
        titleBar.className = "shortcut-settings-title";
        const title = document.createElement("strong");
        title.textContent = "Settings";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "shortcut-settings-close";
        close.textContent = "×";
        close.title = "Close";
        close.onclick = () => this.close();
        titleBar.append(title, close);

        const content = document.createElement("div");
        content.className = "shortcut-settings-content";
        const navigation = document.createElement("nav");
        const keyboardTab = document.createElement("button");
        keyboardTab.type = "button";
        keyboardTab.className = "active";
        keyboardTab.textContent = "Keyboard";
        navigation.appendChild(keyboardTab);

        const page = document.createElement("main");
        const heading = document.createElement("h2");
        heading.textContent = "Keyboard shortcuts";
        const description = document.createElement("p");
        description.textContent = "Click a shortcut field, then press a key combination. Assigning an existing combination moves it to the new action; tools may share a key and will cycle in Tools-window order.";
        this.search = document.createElement("input");
        this.search.type = "search";
        this.search.placeholder = "Search actions";
        this.search.className = "shortcut-settings-search";
        this.search.oninput = () => this.renderRows();
        this.list = document.createElement("div");
        this.list.className = "shortcut-settings-list";
        page.append(heading, description, this.search, this.list);
        content.append(navigation, page);

        const footer = document.createElement("footer");
        footer.className = "shortcut-settings-footer";
        this.status = document.createElement("span");
        const resetAll = document.createElement("button");
        resetAll.type = "button";
        resetAll.textContent = "Reset all";
        resetAll.onclick = () => {
            ActionRegistry.resetAllShortcuts();
            this.setStatus("All shortcuts were reset to their defaults.");
        };
        const done = document.createElement("button");
        done.type = "button";
        done.textContent = "Close";
        done.onclick = () => this.close();
        const buttons = document.createElement("div");
        buttons.append(resetAll, done);
        footer.append(this.status, buttons);

        dialog.append(titleBar, content, footer);
        this.backdrop.appendChild(dialog);
        document.body.appendChild(this.backdrop);
        ActionRegistry.addChangedListener(this.changedListener);
        this.renderRows();
        this.search.focus();
    }

    close() {
        if (this.backdrop === null) return;
        ActionRegistry.removeChangedListener(this.changedListener);
        this.backdrop.remove();
        this.backdrop = null;
        this.list = null;
        this.search = null;
        this.status = null;
    }

    renderRows() {
        if (this.list === null) return;
        const query = this.search === null ? "" : this.search.value.trim().toLowerCase();
        const actions = ActionRegistry.getActionList()
            .map(action => ({
                action,
                name: String(action.getDisplayName()).split("\n")[0]
            }))
            .filter(entry => !query
                || entry.name.toLowerCase().includes(query)
                || entry.action.getActionId().toLowerCase().includes(query)
                || entry.action.getCategory().toLowerCase().includes(query))
            .sort((a, b) => a.action.getCategory().localeCompare(b.action.getCategory())
                || a.name.localeCompare(b.name));

        this.list.innerHTML = "";
        let previousCategory = null;
        for (const entry of actions) {
            const category = entry.action.getCategory();
            if (category !== previousCategory) {
                const categoryElement = document.createElement("h3");
                categoryElement.textContent = category;
                this.list.appendChild(categoryElement);
                previousCategory = category;
            }
            this.list.appendChild(this.createRow(entry.action, entry.name));
        }
    }

    createRow(action, name) {
        const row = document.createElement("div");
        row.className = "shortcut-settings-row";
        const label = document.createElement("label");
        label.textContent = name;
        label.title = action.getActionId();
        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.value = action.getShortcutKey().toString() || "Not assigned";
        input.setAttribute("aria-label", "Shortcut for " + name);
        input.onfocus = () => {
            input.value = "Press shortcut…";
            input.select();
        };
        input.onblur = () => {
            input.value = action.getShortcutKey().toString() || "Not assigned";
        };
        input.onkeydown = event => {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Escape") {
                input.blur();
                return;
            }
            if (event.key === "Backspace" || event.key === "Delete") {
                ActionRegistry.setShortcut(action.getActionId(), null);
                this.setStatus("Shortcut cleared for " + name + ".");
                return;
            }
            const shortcut = ShortcutKey.fromEvent(event);
            if (shortcut.isEmpty()) return;
            const replaced = ActionRegistry.setShortcut(action.getActionId(), shortcut);
            this.setStatus(replaced === null
                ? "Assigned " + shortcut.toString() + " to " + name + "."
                : "Assigned " + shortcut.toString() + " to " + name
                    + " and cleared it from " + replaced.getDisplayName() + ".");
        };
        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Reset";
        reset.disabled = action.getShortcutKey().equals(action.getDefaultShortcutKey());
        reset.onclick = () => ActionRegistry.resetShortcut(action.getActionId());
        row.append(label, input, reset);
        return row;
    }

    setStatus(message) {
        if (this.status !== null) this.status.textContent = message;
    }
}
