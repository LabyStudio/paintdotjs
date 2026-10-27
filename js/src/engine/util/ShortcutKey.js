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

class ShortcutKey {

    constructor(key, shift, ctrl, alt, meta) {
        this.key = key;
        this.shift = shift;
        this.ctrl = ctrl;
        this.alt = alt;
        this.meta = meta;
    }

    isEvent(event) {
        const normalizedKey = ShortcutKey.keyFromEvent(event);
        // On most keyboard layouts "+" requires Shift. Paint.NET displays the
        // binding as Ctrl++ rather than Ctrl+Shift++, so accept that implicit
        // Shift modifier without weakening modifier matching for other keys.
        // While a command modifier is held, browsers report the unshifted "="
        // character, so accept it for plus bindings as well.
        const plusMatches = this.key === "+" && !this.shift
            && (normalizedKey === "+" || normalizedKey === "=");
        const shiftMatches = plusMatches ? true : this.shift === event.shiftKey;
        // On macOS the main delete key reports "Backspace". In command-modified
        // combinations it stands in for the Delete key (for example
        // Shift+Cmd+Delete), while unmodified Backspace keeps its own bindings.
        const macDeleteMatches = Platform.isMac()
            && (event.ctrlKey || event.metaKey)
            && this.key === "Delete" && normalizedKey === "Backspace";

        return this.key !== null
            && (plusMatches || macDeleteMatches || normalizedKey === this.key)
            && shiftMatches
            && this.ctrl === event.ctrlKey
            && this.alt === event.altKey
            && this.meta === event.metaKey;
    }

    isShift() {
        return this.shift;
    }

    isCtrl() {
        return this.ctrl;
    }

    isAlt() {
        return this.alt;
    }

    isMeta() {
        return this.meta;
    }

    getKey() {
        return this.key;
    }

    toString() {
        if (this.key === null) {
            return null;
        }
        let combo = "";
        if (this.ctrl) {
            combo += "Ctrl+";
        }
        if (this.alt) {
            combo += "Alt+";
        }
        if (this.shift) {
            combo += "Shift+";
        }
        if (this.meta) {
            combo += Platform.isMac() ? "Cmd+" : "Meta+";
        }
        combo += ShortcutKey.displayKey(this.key);
        return combo;
    }

    equals(other) {
        return other instanceof ShortcutKey
            && this.key === other.key
            && this.shift === other.shift
            && this.ctrl === other.ctrl
            && this.alt === other.alt
            && this.meta === other.meta;
    }

    isEmpty() {
        return this.key === null;
    }

    static fromCombo(combo) {
        if (combo === null) {
            return new ShortcutKey(null, false, false, false, false);
        }

        let normalizedCombo = String(combo).trim();
        if (normalizedCombo.length === 0) {
            return new ShortcutKey(null, false, false, false, false);
        }
        const plusKey = normalizedCombo.endsWith("+");
        if (plusKey) {
            normalizedCombo = normalizedCombo.slice(0, -1);
        }
        let segments = normalizedCombo.replace(/\s/g, "").split("+").filter(Boolean);
        let targetKey = null;
        let shift = false;
        let ctrl = false;
        let alt = false;
        let meta = false;
        for (let i = 0; i < segments.length; i++) {
            let key = segments[i];
            const modifier = key.toLowerCase();
            if (modifier === "shift") {
                shift = true;
            } else if (modifier === "ctrl" || modifier === "control") {
                ctrl = true;
            } else if (modifier === "alt") {
                alt = true;
            } else if (modifier === "meta" || modifier === "cmd" || modifier === "command") {
                meta = true;
            } else {
                targetKey = ShortcutKey.normalizeKey(key);
            }
        }
        if (plusKey) {
            targetKey = "+";
        }
        return new ShortcutKey(targetKey, shift, ctrl, alt, meta);
    }

    // On macOS the command (Meta) modifier replaces Ctrl in default
    // shortcuts. Returns the shortcut unchanged when it has no Ctrl.
    static withMetaModifier(shortcut) {
        if (!shortcut.isCtrl()) {
            return shortcut;
        }
        return new ShortcutKey(shortcut.getKey(), shortcut.isShift(), false, shortcut.isAlt(), true);
    }

    // On macOS, holding Option composes the pressed key into another
    // character (for example Alt+V reports "ν"). Fall back to the physical
    // key for letter keys so Alt+letter bindings keep matching.
    static keyFromEvent(event) {
        if (Platform.isMac() && event.altKey && typeof event.code === "string"
            && event.code.startsWith("Key")) {
            return event.code.slice(3);
        }
        return ShortcutKey.normalizeKey(event.key);
    }

    static fromEvent(event) {
        let key = ShortcutKey.keyFromEvent(event);
        if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
            return new ShortcutKey(null, false, false, false, false);
        }
        // On macOS the main delete key reports "Backspace"; in command-modified
        // combinations it stands in for the Delete key, matching isEvent().
        if (Platform.isMac() && key === "Backspace"
            && (event.ctrlKey || event.metaKey)) {
            key = "Delete";
        }
        return new ShortcutKey(key, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
    }

    static normalizeKey(key) {
        if (key === null || key === undefined) {
            return null;
        }
        const aliases = {
            " ": "Space",
            Spacebar: "Space",
            Esc: "Escape",
            Del: "Delete",
            Left: "ArrowLeft",
            Right: "ArrowRight",
            Up: "ArrowUp",
            Down: "ArrowDown"
        };
        const normalized = aliases[key] || String(key);
        return normalized.length === 1 ? normalized.toUpperCase() : normalized;
    }

    static displayKey(key) {
        const displayNames = {
            ArrowLeft: "Left",
            ArrowRight: "Right",
            ArrowUp: "Up",
            ArrowDown: "Down",
            Escape: "Esc",
            Delete: "Del",
            " ": "Space"
        };
        return displayNames[key] || key;
    }

}
