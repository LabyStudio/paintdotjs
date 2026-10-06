class ActionRegistry {

    static {
        this.actions = new Map();
        this.storageKey = "paintdotjs.shortcuts.v1";
        this.shortcutOverrides = {};
        this.listeners = new Set();
        this.lastToolSwitchAt = 0;
    }

    static initialize() {
        this.loadOverrides();

        // File
        this.register(new NewFileAction());
        this.registerCallback("menu.file.open", () => DocumentIO.openFilePicker(), "Open...", null, "Ctrl+O");
        this.registerCallback("menu.file.save", () => DocumentIO.saveActive(false), "Save", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+S");
        this.registerCallback("menu.file.saveAs", () => DocumentIO.saveActive(true), "Save As...", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+Shift+S");
        this.registerCallback("menu.file.close", () => window.app.closeDocumentWorkspace(window.app.getActiveDocumentWorkspace()), "Close", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+W");

        // Edit
        this.register(new HistoryUndoAction());
        this.register(new HistoryRedoAction());
        this.register(new EraseSelectionAction());
        this.register(new FillSelectionAction());
        this.register(new FillSelectionAction(true));
        this.register(new InvertSelectionAction());
        this.register(new SelectAllAction());
        this.register(new DeselectAction());
        this.registerCallback("menu.edit.copy", () => DocumentIO.copySelection(), "Copy", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+C");
        this.registerCallback("menu.edit.paste", () => DocumentIO.pasteFromClipboard(), "Paste", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+V");

        // Tools are actions too. Their order is significant because Paint.NET
        // cycles tools which share S, M, or O in this order.
        for (const toolType of ToolType.VALUES) {
            this.register(new ToolAction(toolType));
        }

        // Layer
        this.register(new AddNewLayerAction());
        this.register(new DeleteLayerAction());
        this.register(new DuplicateLayerAction());
        this.register(new MergeLayerDownAction());
        this.register(new LayerPropertiesAction());
        this.register(new ToggleLayerVisibilityAction());

        this.register(new MoveLayerToTopAction());
        this.register(new MoveActiveLayerUpAction());
        this.register(new MoveActiveLayerDownAction());
        this.register(new MoveLayerToBottomAction());

    }

    static register(action) {
        if (Object.prototype.hasOwnProperty.call(this.shortcutOverrides, action.getActionId())) {
            action.setShortcutKey(this.shortcutOverrides[action.getActionId()]);
        }
        this.actions.set(action.getActionId(), action);
        this.notifyChanged(action);
        return action;
    }

    static registerCallback(actionId, callback, displayName, executable = null, shortcutKeyCombo = null) {
        const existing = this.get(actionId);
        if (existing !== null) return existing;
        const defaultShortcut = shortcutKeyCombo === null
            ? this.getBuiltInDefaultShortcut(actionId)
            : shortcutKeyCombo;
        return this.register(new CallbackAction(
            actionId,
            callback,
            displayName,
            executable,
            defaultShortcut
        ));
    }

    static get(actionId) {
        let action = this.actions.get(actionId);
        return action !== undefined ? action : null;
    }

    static getActions() {
        return this.actions;
    }

    static getActionList() {
        return Array.from(this.actions.values());
    }

    static dispatch(event) {
        const matches = Array.from(this.actions.values()).filter(action =>
            action.matchesShortcutEvent(event) && action.runIsActionExecutable()
        );
        const regularAction = matches.find(action => !(action instanceof ToolAction));
        if (regularAction !== undefined) {
            regularAction.runPerformAction();
            return true;
        }

        const toolActions = matches.filter(action => action instanceof ToolAction);
        if (toolActions.length > 0) {
            this.dispatchToolActions(toolActions, event.shiftKey);
            return true;
        }
        return false;
    }

    static dispatchToolActions(actions, reverse) {
        const activeIndex = actions.findIndex(action => action.isActive());
        const now = Date.now();
        // v5 starts a new chord at the first matching tool after two seconds.
        // Only quick repeated presses continue from the currently active tool.
        if (activeIndex === -1 || now - this.lastToolSwitchAt > 2000) {
            const ordered = reverse ? Array.from(actions).reverse() : actions;
            const action = ordered.find(candidate =>
                !candidate.isActive() || !candidate.shouldSkipIfActive()
            );
            if (action !== undefined) {
                action.runPerformAction();
                this.lastToolSwitchAt = now;
            }
            return;
        }
        for (let offset = 1; offset <= actions.length; ++offset) {
            const delta = reverse ? -offset : offset;
            const index = (activeIndex + delta + actions.length) % actions.length;
            const action = actions[index];
            if (!action.isActive() || !action.shouldSkipIfActive()) {
                action.runPerformAction();
                this.lastToolSwitchAt = now;
                return;
            }
        }
    }

    static setShortcut(actionId, shortcutKey) {
        const action = this.get(actionId);
        if (action === null) return null;
        const shortcut = shortcutKey instanceof ShortcutKey
            ? shortcutKey
            : ShortcutKey.fromCombo(shortcutKey);

        let replacedAction = null;
        if (!shortcut.isEmpty()) {
            for (const candidate of this.actions.values()) {
                if (candidate !== action && candidate.getShortcutKey().equals(shortcut)) {
                    // Paint.NET deliberately groups tools under the same key
                    // and cycles them. Preserve that behavior for custom tool
                    // bindings as well.
                    if (candidate instanceof ToolAction && action instanceof ToolAction) {
                        continue;
                    }
                    candidate.setShortcutKey(null);
                    this.shortcutOverrides[candidate.getActionId()] = null;
                    if (replacedAction === null) replacedAction = candidate;
                    this.notifyChanged(candidate);
                }
            }
        }

        action.setShortcutKey(shortcut);
        if (action.getShortcutKey().equals(action.getDefaultShortcutKey())) {
            delete this.shortcutOverrides[actionId];
        } else {
            this.shortcutOverrides[actionId] = action.getShortcutKey().toString();
        }
        this.saveOverrides();
        this.notifyChanged(action);
        return replacedAction;
    }

    static resetShortcut(actionId) {
        const action = this.get(actionId);
        if (action === null) return;
        this.setShortcut(actionId, action.getDefaultShortcutKey());
    }

    static resetAllShortcuts() {
        this.shortcutOverrides = {};
        for (const action of this.actions.values()) action.resetShortcutKey();
        this.saveOverrides();
        this.notifyChanged(null);
    }

    static addChangedListener(listener) {
        this.listeners.add(listener);
    }

    static removeChangedListener(listener) {
        this.listeners.delete(listener);
    }

    static notifyChanged(action) {
        for (const listener of this.listeners) listener(action);
        if (typeof window.app !== "undefined" && window.app !== null) {
            window.app.fire("app:shortcut_changed", action);
        }
    }

    static loadOverrides() {
        try {
            const saved = window.localStorage.getItem(this.storageKey);
            this.shortcutOverrides = saved === null ? {} : JSON.parse(saved);
        } catch (error) {
            this.shortcutOverrides = {};
        }
    }

    static saveOverrides() {
        try {
            window.localStorage.setItem(this.storageKey, JSON.stringify(this.shortcutOverrides));
        } catch (error) {
            // Keep the current session's bindings when storage is unavailable.
        }
    }

    static getBuiltInDefaultShortcut(actionId) {
        const defaults = {
            "menu.settings": "Alt+X",
            "menu.help.helpTopics": "F1",
            "menu.window.tools": "F5",
            "menu.window.history": "F6",
            "menu.window.layers": "F7",
            "menu.window.colors": "F8"
        };
        return defaults[actionId] || null;
    }
}
