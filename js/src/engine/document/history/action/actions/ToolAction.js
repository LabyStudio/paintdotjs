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

class ToolAction extends Action {

    constructor(toolType) {
        super(
            toolType.getId(),
            toolType.getId() + ".name",
            null,
            toolType.getHotKey()
        );
        this.toolType = toolType;
    }

    runPerformAction() {
        if (!this.runIsActionExecutable()) {
            return;
        }
        const toolMenu = PanelRegistry.get("toolMenu");
        const selector = toolMenu === null
            ? null
            : toolMenu.get("toolStripChooser.chooseToolButton");
        if (selector !== null) {
            selector.setSelectedId(this.toolType.getId());
        } else {
            window.app.setActiveToolFromType(this.toolType);
        }
    }

    runIsActionExecutable() {
        return window.app.getActiveDocumentWorkspace() !== null;
    }

    matchesShortcutEvent(event) {
        const shortcut = this.getShortcutKey();
        if (shortcut.isEmpty()) {
            return false;
        }
        if (shortcut.isShift()) {
            return shortcut.isEvent(event);
        }
        return shortcut.getKey() === ShortcutKey.normalizeKey(event.key)
            && shortcut.isCtrl() === event.ctrlKey
            && shortcut.isAlt() === event.altKey
            && shortcut.isMeta() === event.metaKey;
    }

    isActive() {
        const activeTool = window.app.getActiveTool();
        return activeTool !== null && activeTool.getType() === this.toolType;
    }

    shouldSkipIfActive() {
        return this.toolType.getSkipIfActiveOnHotKey();
    }

    getToolType() {
        return this.toolType;
    }

    getShortcutChord() {
        const shortcut = this.getShortcutKey();
        if (shortcut.isEmpty()) {
            return "Not assigned";
        }
        const peers = ActionRegistry.getActionList().filter(action =>
            action instanceof ToolAction
            && action.getShortcutKey().equals(shortcut)
        );
        const chordIndex = Math.max(0, peers.indexOf(this));
        return new Array(chordIndex + 1).fill(shortcut.toString()).join(", ");
    }

    getTooltipText() {
        return i18n("toolsControl.toolToolTip.format")
            .replace("{0}", this.getDisplayName())
            .replace("{1}", this.getShortcutChord());
    }
}
