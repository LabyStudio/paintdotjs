class BitmapEffectAction extends DocumentWorkspaceAction {

    static rememberedValues = new Map();
    static lastEffect = null;

    constructor(definition, shortcut = null) {
        super(
            definition.actionId || "adjustment." + definition.id,
            definition.translationKey || definition.id + ".name",
            null,
            shortcut
        );
        this.definition = definition;
    }

    static cloneValues(values) {
        if (values === null || values === undefined) return values;
        if (typeof structuredClone === "function") return structuredClone(values);
        return JSON.parse(JSON.stringify(values));
    }

    static getRememberedValues(definition) {
        const values = this.rememberedValues.get(definition.id);
        return values === undefined ? null : this.cloneValues(values);
    }

    static getLastEffect() {
        if (this.lastEffect === null) return null;
        return {
            definition: this.lastEffect.definition,
            values: this.cloneValues(this.lastEffect.values)
        };
    }

    static repeatLast(documentWorkspace) {
        const last = this.getLastEffect();
        if (last === null) return null;
        return new BitmapEffectAction(last.definition)
            .performAction(documentWorkspace, last.values);
    }

    async performAction(documentWorkspace, repeatedValues = undefined) {
        const layer = documentWorkspace.getActiveLayer();
        if (!(layer instanceof BitmapLayer)) return null;

        const app = documentWorkspace.getApp();
        const layerIndex = documentWorkspace.getActiveLayerIndex();
        const surface = layer.getSurface();
        const source = surface.context.getImageData(0, 0, surface.getWidth(), surface.getHeight());
        // The selection cannot change while the modal effect dialog is open.
        // Rasterize it once instead of rebuilding a full-size canvas mask for
        // every slider preview. A full-canvas selection collapses to null.
        const selectionMask = BitmapEffectEngine.createSelectionMask(
            surface.getWidth(), surface.getHeight(), documentWorkspace.getSelection());
        const memento = new BitmapHistoryMemento(
            i18n(this.definition.translationKey || this.definition.id + ".name"),
            "assets/icons/" + this.definition.icon,
            documentWorkspace,
            layerIndex
        );
        const present = pixels => {
            surface.context.putImageData(pixels, 0, 0);
            layer.invalidate();
        };
        const render = values => BitmapEffectEngine.apply(
                source, surface.getWidth(), surface.getHeight(), this.definition, values,
                selectionMask
            );

        if (this.definition.controls.length === 0) {
            const values = repeatedValues === undefined ? {} : repeatedValues;
            present(render(values));
            this.rememberSuccessfulEffect(app, values);
            return memento;
        }

        // Some neighborhood effects remain expensive on large images even after
        // their CPU algorithms are optimized. Run them outside the main thread
        // so window movement, cancellation, and slider input remain responsive.
        // Each new preview terminates stale work.
        const useWorker = ["oilPaintingEffect", "bokehEffect"].includes(this.definition.id)
            && typeof Worker !== "undefined" && typeof Blob !== "undefined";
        let workerUrl = null;
        let workerJob = null;
        const setWorkerBusy = busy => {
            document.documentElement.classList.toggle("effect-rendering", busy);
        };
        const getWorkerUrl = () => {
            if (workerUrl !== null) return workerUrl;
            const workerSource = `
                self.Utility = {
                    clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))
                };
                const BitmapEffectEngine = ${BitmapEffectEngine.toString()};
                self.onmessage = event => {
                    const message = event.data;
                    const input = new ImageData(
                        new Uint8ClampedArray(message.sourceBuffer), message.width, message.height);
                    const definition = BitmapEffectEngine.EFFECTS[message.effectId]
                        || BitmapEffectEngine.DEFINITIONS[message.effectId];
                    const selection = message.selectionBuffer === null
                        ? null : new Uint8Array(message.selectionBuffer);
                    const result = BitmapEffectEngine.apply(
                        input, message.width, message.height, definition, message.values, selection);
                    self.postMessage(result.data.buffer, [result.data.buffer]);
                };
            `;
            workerUrl = URL.createObjectURL(new Blob([workerSource], {type: "text/javascript"}));
            return workerUrl;
        };
        const cancelWorker = () => {
            setWorkerBusy(false);
            if (workerJob === null) return;
            const job = workerJob;
            workerJob = null;
            job.worker.terminate();
            job.resolve(null);
        };
        const renderInWorker = values => {
            cancelWorker();
            return new Promise((resolve, reject) => {
                const worker = new Worker(getWorkerUrl());
                const job = {worker, resolve, reject};
                workerJob = job;
                setWorkerBusy(true);
                worker.onmessage = event => {
                    if (workerJob !== job) return;
                    workerJob = null;
                    worker.terminate();
                    setWorkerBusy(false);
                    resolve(new ImageData(
                        new Uint8ClampedArray(event.data), surface.getWidth(), surface.getHeight()));
                };
                worker.onerror = event => {
                    if (workerJob !== job) return;
                    workerJob = null;
                    worker.terminate();
                    setWorkerBusy(false);
                    reject(event.error || new Error(event.message || "Effect worker failed"));
                };
                const sourceData = new Uint8ClampedArray(source.data);
                const selectionData = selectionMask === null ? null : new Uint8Array(selectionMask);
                const transfers = [sourceData.buffer];
                if (selectionData !== null) transfers.push(selectionData.buffer);
                try {
                    worker.postMessage({
                        sourceBuffer: sourceData.buffer,
                        selectionBuffer: selectionData === null ? null : selectionData.buffer,
                        width: surface.getWidth(),
                        height: surface.getHeight(),
                        effectId: this.definition.id,
                        values
                    }, transfers);
                } catch (error) {
                    workerJob = null;
                    worker.terminate();
                    setWorkerBusy(false);
                    reject(error);
                }
            });
        };
        const preview = values => {
            if (values === null) {
                cancelWorker();
                present(source);
                return null;
            }
            if (!useWorker) {
                present(render(values));
                return null;
            }
            return renderInWorker(values).then(pixels => {
                if (pixels !== null) present(pixels);
            });
        };

        const remembered = BitmapEffectAction.getRememberedValues(this.definition);
        const values = repeatedValues === undefined
            ? await EffectConfigDialog.open({
                title: this.definition.dialogTitle
                    || i18n(this.definition.translationKey || this.definition.id + ".name"),
                icon: "assets/icons/" + this.definition.icon,
                layout: this.definition.dialog,
                controls: this.definition.controls,
                values: remembered || BitmapEffectEngine.defaults(this.definition),
                source,
                onPreview: preview
            })
            : BitmapEffectAction.cloneValues(repeatedValues);
        if (values === null) {
            cancelWorker();
            present(source);
            if (workerUrl !== null) URL.revokeObjectURL(workerUrl);
            return null;
        }
        if (repeatedValues === undefined) {
            BitmapEffectAction.rememberedValues.set(
                this.definition.id, BitmapEffectAction.cloneValues(values));
        }
        cancelWorker();
        if (useWorker) {
            try {
                const pixels = await renderInWorker(values);
                if (pixels !== null) present(pixels);
            } catch (error) {
                // Worker creation can be blocked by an unusually strict host
                // policy. Preserve functionality with the optimized sync path.
                console.error("Effect worker failed; using the main thread", error);
                present(render(values));
            }
        } else {
            present(render(values));
        }
        cancelWorker();
        if (workerUrl !== null) URL.revokeObjectURL(workerUrl);
        this.rememberSuccessfulEffect(app, values);
        return memento;
    }

    rememberSuccessfulEffect(app, values) {
        if (BitmapEffectEngine.EFFECTS[this.definition.id] === this.definition) {
            BitmapEffectAction.lastEffect = {
                definition: this.definition,
                values: BitmapEffectAction.cloneValues(values)
            };
        }
        app.fire("document:effect_applied", this.definition.id);
    }

    isActionExecutable(documentWorkspace) {
        return documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }
}

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
        if (last === null) return i18n("effects.repeatMenuItem.format", [""]);
        const name = i18n(last.definition.translationKey || last.definition.id + ".name");
        return i18n("effects.repeatMenuItem.format", [name]);
    }
}
