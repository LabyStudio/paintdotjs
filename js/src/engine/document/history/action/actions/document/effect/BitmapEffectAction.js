class BitmapEffectAction extends DocumentWorkspaceAction {

    constructor(definition, shortcut = null) {
        super(
            definition.actionId || "adjustment." + definition.id,
            definition.translationKey || definition.id + ".name",
            null,
            shortcut
        );
        this.definition = definition;
    }

    async performAction(documentWorkspace) {
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
            present(render({}));
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

        const values = await EffectConfigDialog.open({
            title: this.definition.dialogTitle
                || i18n(this.definition.translationKey || this.definition.id + ".name"),
            icon: "assets/icons/" + this.definition.icon,
            layout: this.definition.dialog,
            controls: this.definition.controls,
            values: BitmapEffectEngine.defaults(this.definition),
            source,
            onPreview: preview
        });
        if (values === null) {
            cancelWorker();
            present(source);
            if (workerUrl !== null) URL.revokeObjectURL(workerUrl);
            return null;
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
        app.fire("document:effect_applied", this.definition.id);
        return memento;
    }

    isActionExecutable(documentWorkspace) {
        return documentWorkspace.getActiveLayer() instanceof BitmapLayer;
    }
}
