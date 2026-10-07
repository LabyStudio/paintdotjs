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
        this.registerCallback("menu.file.saveAll", () => DocumentIO.saveAll(), "Save All", () => window.app.getDocumentWorkspaces().some(workspace => workspace.isDirty()), "Ctrl+Alt+S");
        this.registerCallback("menu.file.print", () => DocumentIO.printActive(), "Print...", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+P");
        this.registerCallback("menu.file.close", () => DocumentIO.closeDocumentWorkspace(window.app.getActiveDocumentWorkspace()), "Close", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+W");

        // Edit
        this.register(new HistoryUndoAction());
        this.register(new HistoryRedoAction());
        this.register(new EraseSelectionAction());
        this.register(new FillSelectionAction());
        this.register(new FillSelectionAction(true));
        this.register(new InvertSelectionAction());
        this.register(new SelectAllAction());
        this.register(new DeselectAction());
        this.registerCallback("menu.edit.copy", () => DocumentIO.copySelection(), "Copy", () => {
            const workspace = window.app.getActiveDocumentWorkspace();
            return workspace !== null && !workspace.getSelection().isEmpty();
        }, "Ctrl+C");
        this.registerCallback("menu.edit.cut", () => DocumentIO.cutSelection(), "Cut", () => {
            const workspace = window.app.getActiveDocumentWorkspace();
            return workspace !== null
                && !workspace.getSelection().isEmpty()
                && workspace.getActiveLayer() instanceof BitmapLayer;
        }, "Ctrl+X");
        this.registerCallback("menu.edit.copyMerged", () => DocumentIO.copySelection(true), "Copy Merged", () => {
            const workspace = window.app.getActiveDocumentWorkspace();
            return workspace !== null && !workspace.getSelection().isEmpty();
        }, "Ctrl+Shift+C");
        this.registerCallback("menu.edit.paste", () => DocumentIO.pasteFromClipboard(), "Paste", () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+V");
        this.registerCallback("menu.edit.pasteInToNewLayer", () => DocumentIO.pasteIntoNewLayer(), () => i18n("menu.edit.pasteInToNewLayer.text"), () => window.app.getActiveDocumentWorkspace() !== null, "Ctrl+Shift+V");
        this.registerCallback("menu.edit.pasteInToNewImage", () => DocumentIO.pasteIntoNewImage(), () => i18n("menu.edit.pasteInToNewImage.text"), null, "Ctrl+Alt+V");
        this.registerCallback("menu.edit.copySelection", () => DocumentIO.copySelectionOutline(), () => i18n("menu.edit.copySelection.text"), () => {
            const workspace = window.app.getActiveDocumentWorkspace();
            return workspace !== null && !workspace.getSelection().isEmpty();
        }, "Ctrl+Alt+Shift+C");
        this.registerCallback("menu.edit.pasteSelection", () => DocumentIO.pasteSelectionOutline(), () => i18n("menu.edit.pasteSelection.text"), () => window.app.getActiveDocumentWorkspace() !== null && DocumentIO.internalSelectionPath !== null, "Ctrl+Alt+Shift+V");

        // View. These match Paint.NET 5's command behavior and shortcuts.
        const activeWorkspace = () => window.app.getActiveDocumentWorkspace();
        const hasWorkspace = () => activeWorkspace() !== null;
        this.registerCallback("menu.view.zoomIn", () => {
            const workspace = activeWorkspace();
            workspace.setZoomToWindow(false);
            workspace.setZoom(workspace.getZoom() * 1.25);
        }, () => i18n("menu.view.zoomIn.text"), hasWorkspace, "Ctrl++");
        this.registerCallback("menu.view.zoomOut", () => {
            const workspace = activeWorkspace();
            workspace.setZoomToWindow(false);
            workspace.setZoom(workspace.getZoom() / 1.25);
        }, () => i18n("menu.view.zoomOut.text"), hasWorkspace, "Ctrl+-");
        this.registerCallback("menu.view.zoomToWindow", () => activeWorkspace().setZoomToWindow(true), () => i18n("menu.view.zoomToWindow.text"), hasWorkspace, "Ctrl+B");
        this.registerCallback("menu.view.zoomToSelection", () => {
            const workspace = activeWorkspace();
            workspace.zoomToRectangle(workspace.getSelection().getBounds());
        }, () => i18n("menu.view.zoomToSelection.text"), () => hasWorkspace() && !activeWorkspace().getSelection().isEmpty(), "Ctrl+Shift+B");
        this.registerCallback("menu.view.actualSize", () => {
            const workspace = activeWorkspace();
            workspace.setZoomToWindow(false);
            workspace.setZoom(1);
        }, () => i18n("menu.view.actualSize.text"), hasWorkspace, "Ctrl+0");
        this.registerCallback("menu.view.grid", () => window.app.setGridVisible(!window.app.isGridVisible()), () => i18n("menu.view.grid.text"), hasWorkspace);
        this.registerCallback("menu.view.rulers", () => window.app.setRulersVisible(!window.app.isRulersVisible()), () => i18n("menu.view.rulers.text"), hasWorkspace);
        for (const unit of ["pixel", "inch", "centimeter"]) {
            this.registerCallback("measurementUnit." + unit, () => window.app.setMeasurementUnit(unit), () => i18n("measurementUnit." + unit + ".plural"), hasWorkspace);
        }

        // Image
        this.registerCallback("menu.image.crop", () => DocumentIO.cropToSelection(), () => i18n("menu.image.crop.text"), () => hasWorkspace() && !activeWorkspace().getSelection().isEmpty(), "Ctrl+Shift+X");
        this.registerCallback("menu.image.resize", () => DocumentIO.resizeImage(), () => i18n("menu.image.resize.text"), hasWorkspace, "Ctrl+R");
        this.registerCallback("menu.image.canvasSize", () => DocumentIO.changeCanvasSize(), () => i18n("menu.image.canvasSize.text"), hasWorkspace, "Ctrl+Shift+R");
        const documentTransformShortcuts = {
            rotate90CW: "Ctrl+H",
            rotate90CCW: "Ctrl+G"
        };
        for (const transformType of ["flipHorizontal", "flipVertical", "rotate90CW", "rotate90CCW", "rotate180"]) {
            this.registerCallback(
                "menu.image." + transformType,
                () => DocumentIO.transformDocument(transformType),
                () => i18n("menu.image." + transformType + ".text"),
                hasWorkspace,
                documentTransformShortcuts[transformType] || null
            );
        }
        this.registerCallback("menu.image.flatten", () => DocumentIO.flattenDocument(), () => i18n("menu.image.flatten.text"), () => hasWorkspace() && activeWorkspace().getDocument().getLayers().getLayerCount() > 1, "Ctrl+Shift+F");

        const adjustmentShortcuts = {
            autoLevel: "Ctrl+Shift+L",
            desaturateEffect: "Ctrl+Shift+G",
            invertColorsEffect: "Ctrl+Shift+I"
        };
        for (const definition of Object.values(BitmapEffectEngine.DEFINITIONS)) {
            this.register(new BitmapEffectAction(definition, adjustmentShortcuts[definition.id] || null));
        }
        for (const definition of Object.values(BitmapEffectEngine.EFFECTS)) {
            definition.actionId = "menu.effects." + definition.id;
            this.register(new BitmapEffectAction(definition));
        }
        this.register(new RepeatEffectAction());
        this.register(new BitmapEffectAction(BitmapEffectEngine.ROTATE_ZOOM));

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

        const selectLayer = indexSelector => {
            const workspace = activeWorkspace();
            workspace.setActiveLayerIndex(indexSelector(workspace));
        };
        const canSelectAbove = () => hasWorkspace()
            && activeWorkspace().getActiveLayerIndex() < activeWorkspace().getDocument().getLayers().size() - 1;
        const canSelectBelow = () => hasWorkspace() && activeWorkspace().getActiveLayerIndex() > 0;
        this.registerCallback("menu.layers.importFromFile", () => DocumentIO.openLayerFilePicker(), () => i18n("menu.layers.importFromFile.text"), hasWorkspace);
        this.registerCallback("menu.layers.goToTopLayer", () => selectLayer(workspace => workspace.getDocument().getLayers().size() - 1), () => i18n("menu.layers.goToTopLayer.text"), canSelectAbove, "Ctrl+Alt+PageUp");
        this.registerCallback("menu.layers.goToLayerAbove", () => selectLayer(workspace => workspace.getActiveLayerIndex() + 1), () => i18n("menu.layers.goToLayerAbove.text"), canSelectAbove, "Alt+PageUp");
        this.registerCallback("menu.layers.goToLayerBelow", () => selectLayer(workspace => workspace.getActiveLayerIndex() - 1), () => i18n("menu.layers.goToLayerBelow.text"), canSelectBelow, "Alt+PageDown");
        this.registerCallback("menu.layers.goToBottomLayer", () => selectLayer(() => 0), () => i18n("menu.layers.goToBottomLayer.text"), canSelectBelow, "Ctrl+Alt+PageDown");
        for (const transformType of ["flipHorizontal", "flipVertical", "rotate180"]) {
            this.registerCallback("menu.layers." + transformType, () => DocumentIO.transformActiveLayer(transformType), () => i18n("menu.layers." + transformType + ".text"), hasWorkspace);
        }

        this.initialized = true;
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
        // Callback-backed UI entries may be registered while panels are being
        // built, after the core registry has finished initializing. Inspect the
        // map directly here; get() intentionally reports genuinely missing
        // actions to callers once initialization is complete.
        const existing = this.actions.get(actionId);
        if (existing !== undefined) return existing;
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
