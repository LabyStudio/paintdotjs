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

class RepeatEffectAction extends DocumentWorkspaceAction {

    constructor() {
        super("menu.effects.repeat", null, null, "Ctrl+F");
    }

    performAction(documentWorkspace) {
        return BitmapEffectAction.repeatLast(documentWorkspace);
    }

    isActionExecutable(documentWorkspace) {
        return BitmapEffectAction.getLastEffect() !== null
            && documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }

    getDisplayName() {
        const last = BitmapEffectAction.getLastEffect();
        if (last === null) {
            return i18n("effects.repeatMenuItem.format", [""]);
        }
        const name = i18n(last.definition.translationKey || last.definition.id + ".name");
        return i18n("effects.repeatMenuItem.format", [name]);
    }
}
