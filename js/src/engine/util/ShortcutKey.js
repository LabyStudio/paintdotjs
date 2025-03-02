class ShortcutKey {

    constructor(key, shift, ctrl, alt, meta) {
        this.key = key;
        this.shift = shift;
        this.ctrl = ctrl;
        this.alt = alt;
        this.meta = meta;
    }

    isEvent(event) {
        if (this.shift && !event.shiftKey) {
            return false;
        }
        if (this.ctrl && !event.ctrlKey) {
            return false;
        }
        if (this.alt && !event.altKey) {
            return false;
        }
        if (this.meta && !event.metaKey) {
            return false;
        }
        return this.key !== null && event.key.toUpperCase() === this.key.toUpperCase();
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
        if (this.shift) {
            combo += "Shift+";
        }
        if (this.ctrl) {
            combo += "Ctrl+";
        }
        if (this.alt) {
            combo += "Alt+";
        }
        if (this.meta) {
            combo += "Meta+";
        }
        combo += this.key;
        return combo;
    }

    static fromCombo(combo) {
        if (combo === null) {
            return new ShortcutKey(null, false, false, false, false);
        }

        let segments = combo.replace(/\s/g, "").split("+");
        let targetKey = null;
        let shift = false;
        let ctrl = false;
        let alt = false;
        let meta = false;
        for (let i = 0; i < segments.length; i++) {
            let key = segments[i];
            if (key === "Shift") {
                shift = true;
            } else if (key === "Ctrl") {
                ctrl = true;
            } else if (key === "Alt") {
                alt = true;
            } else if (key === "Meta") {
                meta = true;
            } else {
                targetKey = key;
            }
        }
        return new ShortcutKey(targetKey, shift, ctrl, alt, meta);
    }

    static fromEvent(event) {
        return new ShortcutKey(event.key, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
    }

}