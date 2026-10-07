class FontManager {

    static databaseName = "paintdotjs-user-fonts";
    static databaseVersion = 1;
    static storeName = "fonts";
    static records = [];
    static faces = new Map();
    static initialization = null;

    static initialize() {
        if (this.initialization === null) {
            this.initialization = this.loadStoredFonts().catch(error => {
                console.error("Could not load user fonts", error);
            });
        }
        return this.initialization;
    }

    static isFontFile(file) {
        if (file === null || file === undefined) return false;
        const extension = String(file.name || "").toLowerCase().split(".").pop();
        return ["ttf", "otf", "woff", "woff2"].includes(extension)
            || /^font\//i.test(String(file.type || ""));
    }

    static getAcceptedFileTypes() {
        return ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";
    }

    static getFonts() {
        return [...this.records].sort((left, right) =>
            left.name.localeCompare(right.name, undefined, {sensitivity: "base"}));
    }

    static getTextToolChoices() {
        const builtIn = [
            ["Calibri", "Calibri"], ["Segoe UI", "Segoe UI"], ["Arial", "Arial"],
            ["serif", "Serif"], ["monospace", "Monospace"]
        ];
        return [...builtIn, ...this.getFonts().map(font => [font.family, font.name])];
    }

    static async importFiles(files) {
        await this.initialize();
        const added = [];
        const errors = [];
        for (const file of Array.from(files || []).filter(file => this.isFontFile(file))) {
            try {
                added.push(await this.addFont(file, false));
            } catch (error) {
                errors.push({file, error});
            }
        }
        // One event is enough for a batch. Rebuilding the Text toolbar after
        // every file made large imports repeatedly destroy an open picker.
        if (added.length > 0) this.notifyChanged();
        return {added, errors};
    }

    static async addFont(file, notify = true) {
        if (!this.isFontFile(file)) throw new Error("Unsupported font format");
        const data = await file.arrayBuffer();
        if (data.byteLength === 0) throw new Error("The font file is empty");

        const id = typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2);
        const baseName = String(file.name || "Custom Font").replace(/\.[^.]+$/, "");
        const name = baseName.trim() || "Custom Font";
        const safeName = name.replace(/[\\'";,]/g, " ").replace(/\s+/g, " ").trim();
        const family = `paintjs-${safeName || "font"}-${id}`;
        const record = {
            id,
            name,
            family,
            fileName: String(file.name || name),
            type: String(file.type || ""),
            size: data.byteLength,
            addedAt: Date.now(),
            data
        };

        // Validate and load before persisting so corrupt files never appear in
        // Settings after the browser rejects them.
        const face = await this.createFace(record);
        try {
            const database = await this.openDatabase();
            await this.runRequest(database, "readwrite", store => store.put(record));
        } catch (error) {
            document.fonts.delete(face);
            throw error;
        }
        this.records.push(record);
        this.faces.set(id, face);
        if (notify) this.notifyChanged();
        return record;
    }

    static async removeFont(id) {
        await this.initialize();
        const record = this.records.find(font => font.id === id);
        if (record === undefined) return false;
        const database = await this.openDatabase();
        await this.runRequest(database, "readwrite", store => store.delete(id));
        const face = this.faces.get(id);
        if (face !== undefined) document.fonts.delete(face);
        this.faces.delete(id);
        this.records = this.records.filter(font => font.id !== id);

        if (typeof ToolType !== "undefined"
            && ToolType.TEXT.getSetting("fontFamily") === record.family) {
            ToolType.TEXT.setSetting("fontFamily", "Segoe UI");
            window.app?.fire?.("app:tool_setting_changed", ToolType.TEXT,
                "fontFamily", "Segoe UI");
        }
        this.notifyChanged();
        return true;
    }

    static async loadStoredFonts() {
        if (!("indexedDB" in window) || !("FontFace" in window)) return;
        const database = await this.openDatabase();
        const records = await this.runRequest(database, "readonly", store => store.getAll());
        // Make the names available to the toolbar immediately. Decoding a
        // large personal font collection in one uninterrupted run made the
        // first Text-tool activation contend with Chromium's font parser.
        this.records = records;
        this.notifyChanged();

        const invalidIds = new Set();
        let loadedInBatch = 0;
        for (const record of records) {
            try {
                const face = await this.createFace(record);
                this.faces.set(record.id, face);
            } catch (error) {
                invalidIds.add(record.id);
                console.warn(`Could not load stored font "${record.fileName}"`, error);
            }

            // FontFace construction/validation can do synchronous parsing.
            // Yield regularly so selecting a tool, painting, and zooming stay
            // responsive even with hundreds of persisted fonts.
            if (++loadedInBatch >= 4) {
                loadedInBatch = 0;
                await this.yieldToBrowser();
            }
        }
        if (invalidIds.size > 0) {
            this.records = this.records.filter(record => !invalidIds.has(record.id));
            this.notifyChanged();
        }
    }

    static yieldToBrowser() {
        if (typeof scheduler !== "undefined" && typeof scheduler.yield === "function") {
            return scheduler.yield();
        }
        return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }

    static async createFace(record) {
        const face = new FontFace(record.family, record.data);
        await face.load();
        document.fonts.add(face);
        return face;
    }

    static openDatabase() {
        return new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) {
                reject(new Error("Persistent browser storage is not available"));
                return;
            }
            const request = indexedDB.open(this.databaseName, this.databaseVersion);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName, {keyPath: "id"});
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not open font storage"));
        });
    }

    static runRequest(database, mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, mode);
            const request = callback(transaction.objectStore(this.storeName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Font storage operation failed"));
            transaction.oncomplete = () => database.close();
            transaction.onabort = () => {
                database.close();
                reject(transaction.error || new Error("Font storage transaction failed"));
            };
        });
    }

    static notifyChanged() {
        window.dispatchEvent(new CustomEvent("paintdotjs:fonts-changed", {
            detail: {fonts: this.getFonts()}
        }));
    }
}
