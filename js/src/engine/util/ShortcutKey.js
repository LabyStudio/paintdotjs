class ShortcutKey {

    constructor(key, shift, ctrl, alt, meta) {
        this.key = key;
        this.shift = shift;
        this.ctrl = ctrl;
        this.alt = alt;
        this.meta = meta;
    }

    isEvent(event) {
        return this.key !== null
            && this.shift === event.shiftKey
            && this.ctrl === event.ctrlKey
            && this.alt === event.altKey
            && this.meta === event.metaKey
            && ShortcutKey.normalizeKey(event.key) === this.key;
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
            combo += "Meta+";
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
        if (plusKey) normalizedCombo = normalizedCombo.slice(0, -1);
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
        if (plusKey) targetKey = "+";
        return new ShortcutKey(targetKey, shift, ctrl, alt, meta);
    }

    static fromEvent(event) {
        const key = ShortcutKey.normalizeKey(event.key);
        if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
            return new ShortcutKey(null, false, false, false, false);
        }
        return new ShortcutKey(key, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
    }

    static normalizeKey(key) {
        if (key === null || key === undefined) return null;
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
