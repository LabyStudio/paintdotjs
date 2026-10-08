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

class Action {

    constructor(
        actionId,
        nameTranslationId,
        descriptionTranslationId,
        shortcutKeyCombo
    ) {
        this.actionId = actionId;
        this.nameTranslationId = nameTranslationId;
        this.descriptionTranslationId = descriptionTranslationId;
        this.defaultShortcutKey = ShortcutKey.fromCombo(shortcutKeyCombo);
        this.shortcutKey = ShortcutKey.fromCombo(shortcutKeyCombo);
    }

    runPerformAction() {
        throw new Error("No action implementation provided for " + this.getActionId());
    }

    runIsActionExecutable() {
        return true;
    }

    createIconItem() {
        let item = new IconItem(this.getActionId(), () => {
            this.runPerformAction();
        });
        item.withTranslationKey(this.getDescriptionTranslationId());
        return item;
    }

    createDropEntry() {
        let item = new DropEntry(this.getActionId(), () => {
            this.runPerformAction();
        });
        if (this.getNameTranslationId() === null) {
            item.getText = () => this.getDisplayName();
        } else {
            item.withTranslationKey(this.getNameTranslationId());
        }
        return item;
    }

    getActionId() {
        return this.actionId;
    }

    getNameTranslationId() {
        return this.nameTranslationId;
    }

    getDescriptionTranslationId() {
        return this.descriptionTranslationId;
    }

    getShortcutKey() {
        return this.shortcutKey;
    }

    matchesShortcutEvent(event) {
        return this.shortcutKey.isEvent(event);
    }

    getTooltipText() {
        return null;
    }

    getDefaultShortcutKey() {
        return this.defaultShortcutKey;
    }

    setShortcutKey(shortcutKey) {
        this.shortcutKey = shortcutKey instanceof ShortcutKey
            ? shortcutKey
            : ShortcutKey.fromCombo(shortcutKey);
    }

    resetShortcutKey() {
        this.shortcutKey = ShortcutKey.fromCombo(this.defaultShortcutKey.toString());
    }

    getDisplayName() {
        if (this.nameTranslationId === null) return this.actionId;
        return i18n(this.nameTranslationId);
    }

    getCategory() {
        const categories = ["file", "edit", "view", "image", "layers", "adjustments", "effects", "window", "help"];
        for (const category of categories) {
            if (this.actionId.startsWith("menu." + category + ".")) {
                return category[0].toUpperCase() + category.slice(1);
            }
        }
        if (this.actionId.endsWith("Tool")) return "Tools";
        if (this.actionId.startsWith("measurementUnit.")) return "View";
        return "General";
    }

}

class CallbackAction extends Action {

    constructor(actionId, callback, displayName, executable = null, shortcutKeyCombo = null) {
        super(actionId, null, null, shortcutKeyCombo);
        this.callback = callback;
        this.displayName = displayName;
        this.executable = executable;
    }

    runPerformAction() {
        if (this.runIsActionExecutable()) this.callback();
    }

    runIsActionExecutable() {
        return this.executable === null || this.executable();
    }

    getDisplayName() {
        return typeof this.displayName === "function"
            ? this.displayName()
            : (this.displayName || this.actionId);
    }
}
