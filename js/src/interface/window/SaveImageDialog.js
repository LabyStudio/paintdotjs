class SaveImageDialog {
    static FORMATS = [
        {id: "pdn", name: "Paint.NET image", extension: ".pdn", mime: "application/x-paintdotnet"},
        {id: "png", name: "PNG", extension: ".png", mime: "image/png"},
        {id: "jpeg", name: "JPEG", extension: ".jpg", extensions: [".jpg", ".jpeg", ".jpe"], mime: "image/jpeg", quality: 95},
        {id: "jxl", name: "JPEG XL", extension: ".jxl", mime: "image/jxl", quality: 90},
        {id: "avif", name: "AV1 (AVIF)", extension: ".avif", mime: "image/avif", quality: 90},
        {id: "heic", name: "HEIC", extension: ".heic", extensions: [".heic", ".heif"], mime: "image/heic", quality: 90},
        {id: "webp", name: "WebP", extension: ".webp", mime: "image/webp", quality: 90},
        {id: "dds", name: "DirectDraw Surface (DDS)", extension: ".dds", mime: "image/vnd-ms.dds"},
        {id: "tiff", name: "TIFF", extension: ".tif", extensions: [".tif", ".tiff"], mime: "image/tiff"},
        {id: "gif", name: "GIF", extension: ".gif", mime: "image/gif"},
        {id: "bmp", name: "BMP", extension: ".bmp", mime: "image/bmp"},
        {id: "tga", name: "TGA", extension: ".tga", mime: "image/x-tga"},
        {id: "jxr", name: "JPEG XR", extension: ".jxr", extensions: [".jxr", ".wdp", ".wmp"], mime: "image/vnd.ms-photo", quality: 90}
    ];

    static find(id) {
        return this.FORMATS.find(format => format.id === id) || this.FORMATS[1];
    }

    static fromFileName(name, fallback = "png") {
        const lower = String(name || "").toLowerCase();
        return this.FORMATS.find(format => (format.extensions || [format.extension])
            .some(extension => lower.endsWith(extension))) || this.find(fallback);
    }

    static open(options) {
        if (this.activePromise !== null) return this.activePromise;
        this.activePromise = this.show(options).finally(() => {
            this.activePromise = null;
        });
        return this.activePromise;
    }

    static show(options) {
        return new Promise(resolve => {
            const canvas = options.canvas;
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop save-config-backdrop";
            if (isApp) backdrop.classList.add("dialog-backdrop-app");
            const dialog = document.createElement("form");
            dialog.className = "app-dialog save-config-dialog";

            const titleBar = document.createElement("header");
            titleBar.className = "app-dialog-title-bar";
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            const icon = document.createElement("img");
            icon.src = "assets/icons/menu_file_save_icon.png";
            icon.alt = "";
            const title = document.createElement("strong");
            title.textContent = "Save Configuration";
            titleGroup.append(icon, title);
            const close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            close.title = "Close";
            titleBar.append(titleGroup, close);

            const content = document.createElement("div");
            content.className = "save-config-content";
            const settings = document.createElement("aside");
            settings.className = "save-config-settings";
            settings.appendChild(this.heading("Settings"));

            const typeLabel = document.createElement("label");
            typeLabel.className = "save-config-label";
            typeLabel.textContent = "File type";
            const formatSelect = document.createElement("select");
            formatSelect.className = "save-config-format";
            formatSelect.autofocus = true;
            for (const format of this.FORMATS) {
                const option = document.createElement("option");
                option.value = format.id;
                option.textContent = format.name + " (" + (format.extensions || [format.extension]).join(", ") + ")";
                formatSelect.appendChild(option);
            }

            const qualityGroup = document.createElement("section");
            qualityGroup.className = "save-config-quality";
            qualityGroup.appendChild(this.heading("Quality"));
            const qualityControls = document.createElement("div");
            qualityControls.className = "save-config-quality-controls";
            const quality = document.createElement("input");
            quality.type = "range";
            quality.min = "0";
            quality.max = "100";
            quality.step = "1";
            const qualityNumber = document.createElement("input");
            qualityNumber.type = "number";
            qualityNumber.min = "0";
            qualityNumber.max = "100";
            qualityNumber.step = "1";
            qualityControls.append(quality, qualityNumber);
            qualityGroup.appendChild(qualityControls);

            const chromaGroup = document.createElement("section");
            chromaGroup.className = "save-config-chroma-group";
            chromaGroup.appendChild(this.heading("Chroma Subsampling"));
            const chroma = document.createElement("select");
            chroma.className = "save-config-chroma";
            for (const value of ["4:4:4", "4:2:2", "4:4:0", "4:2:0"]) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                chroma.appendChild(option);
            }
            chromaGroup.appendChild(chroma);
            const defaults = document.createElement("button");
            defaults.type = "button";
            defaults.className = "save-config-defaults";
            defaults.textContent = "Defaults";
            settings.append(typeLabel, formatSelect, qualityGroup, chromaGroup, defaults);

            const previewSection = document.createElement("section");
            previewSection.className = "save-config-preview-section";
            const previewHeading = this.heading("Preview, file size: calculating…");
            previewHeading.classList.add("save-config-preview-heading");
            const previewFrame = document.createElement("div");
            previewFrame.className = "save-config-preview-frame";
            previewFrame.tabIndex = 0;
            previewFrame.title = "Mouse wheel to zoom. Double-click to toggle Fit and 100%.";
            const previewStage = document.createElement("div");
            previewStage.className = "save-config-preview-stage";
            const preview = document.createElement("img");
            preview.alt = "Saved image preview";
            preview.draggable = false;
            previewStage.appendChild(preview);
            previewFrame.appendChild(previewStage);
            previewSection.append(previewHeading, previewFrame);
            content.append(settings, previewSection);

            const footer = document.createElement("footer");
            footer.className = "app-dialog-footer save-config-footer";
            const status = document.createElement("span");
            status.className = "save-config-status";
            const buttons = document.createElement("div");
            const ok = document.createElement("button");
            ok.type = "submit";
            ok.textContent = "OK";
            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.textContent = "Cancel";
            buttons.append(ok, cancel);
            footer.append(status, buttons);

            const initialFormat = this.find(options.initialFormat || "png");
            const initialOptions = {...(options.initialOptions || {})};
            const qualities = new Map(this.FORMATS.filter(format => format.quality !== undefined)
                .map(format => [format.id, format.id === initialFormat.id
                    ? Number(initialOptions.quality ?? format.quality) : format.quality]));
            let mover = null;
            let closed = false;
            let timer = null;
            let generation = 0;
            let previewUrl = null;
            let currentBlob = null;
            let renderPromise = Promise.resolve();
            let zoom = 1;
            let fitZoom = 1;
            let autoFit = true;
            let previewWidth = Math.max(1, canvas.width);
            let previewHeight = Math.max(1, canvas.height);
            const zoomMetrics = () => {
                const imageWidth = previewWidth * zoom;
                const imageHeight = previewHeight * zoom;
                const stageWidth = Math.max(previewFrame.clientWidth, imageWidth + 64);
                const stageHeight = Math.max(previewFrame.clientHeight, imageHeight + 64);
                return {
                    imageWidth, imageHeight, stageWidth, stageHeight,
                    imageLeft: (stageWidth - imageWidth) / 2,
                    imageTop: (stageHeight - imageHeight) / 2
                };
            };
            const layoutPreview = () => {
                const metrics = zoomMetrics();
                previewStage.style.width = metrics.stageWidth + "px";
                previewStage.style.height = metrics.stageHeight + "px";
                preview.style.width = metrics.imageWidth + "px";
                preview.style.height = metrics.imageHeight + "px";
                preview.style.left = metrics.imageLeft + "px";
                preview.style.top = metrics.imageTop + "px";
            };
            const calculateFitZoom = () => Math.max(0.01, Math.min(
                1,
                (previewFrame.clientWidth - 64) / previewWidth,
                (previewFrame.clientHeight - 64) / previewHeight
            ));
            const fitPreview = () => {
                fitZoom = calculateFitZoom();
                zoom = fitZoom;
                autoFit = true;
                layoutPreview();
                previewFrame.scrollLeft = (previewStage.offsetWidth - previewFrame.clientWidth) / 2;
                previewFrame.scrollTop = (previewStage.offsetHeight - previewFrame.clientHeight) / 2;
            };
            const setZoom = (value, clientX = null, clientY = null) => {
                const old = zoomMetrics();
                const bounds = previewFrame.getBoundingClientRect();
                const viewportX = clientX === null ? previewFrame.clientWidth / 2 : clientX - bounds.left;
                const viewportY = clientY === null ? previewFrame.clientHeight / 2 : clientY - bounds.top;
                const imageX = (previewFrame.scrollLeft + viewportX - old.imageLeft) / zoom;
                const imageY = (previewFrame.scrollTop + viewportY - old.imageTop) / zoom;
                zoom = Math.max(0.01, Math.min(16, value));
                autoFit = false;
                layoutPreview();
                const next = zoomMetrics();
                previewFrame.scrollLeft = next.imageLeft + imageX * zoom - viewportX;
                previewFrame.scrollTop = next.imageTop + imageY * zoom - viewportY;
            };
            preview.onload = () => {
                previewWidth = Math.max(1, preview.naturalWidth || canvas.width);
                previewHeight = Math.max(1, preview.naturalHeight || canvas.height);
                fitZoom = calculateFitZoom();
                if (autoFit) fitPreview();
                else layoutPreview();
            };
            previewFrame.addEventListener("wheel", event => {
                event.preventDefault();
                event.stopPropagation();
                const factor = Math.exp(-event.deltaY * 0.002);
                setZoom(zoom * factor, event.clientX, event.clientY);
            }, {passive: false});
            previewFrame.ondblclick = event => {
                event.preventDefault();
                if (Math.abs(zoom - fitZoom) < 0.01) setZoom(1, event.clientX, event.clientY);
                else fitPreview();
            };
            const resizeObserver = new ResizeObserver(() => {
                if (autoFit) fitPreview();
                else layoutPreview();
            });
            resizeObserver.observe(previewFrame);
            const clampQuality = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
            const setQuality = value => {
                const result = clampQuality(value);
                quality.value = String(result);
                qualityNumber.value = String(result);
                qualities.set(formatSelect.value, result);
            };
            const formatSize = bytes => {
                if (bytes < 1024) return bytes.toLocaleString() + " bytes";
                if (bytes < 1024 * 1024) return (bytes / 1024).toLocaleString(undefined, {
                    minimumFractionDigits: 1, maximumFractionDigits: 1
                }) + " KB";
                return (bytes / 1024 / 1024).toLocaleString(undefined, {
                    minimumFractionDigits: 1, maximumFractionDigits: 1
                }) + " MB";
            };
            const selectedOptions = () => {
                const format = this.find(formatSelect.value);
                const result = {};
                if (format.quality !== undefined) result.quality = qualities.get(format.id) ?? format.quality;
                if (format.id === "jpeg") result.subsampling = chroma.value;
                return result;
            };
            const refreshControls = () => {
                const format = this.find(formatSelect.value);
                qualityGroup.hidden = format.quality === undefined;
                chromaGroup.hidden = format.id !== "jpeg";
                defaults.hidden = format.quality === undefined;
                if (format.quality !== undefined) setQuality(qualities.get(format.id) ?? format.quality);
            };
            const render = async () => {
                const ownGeneration = ++generation;
                ok.disabled = true;
                status.textContent = "Updating preview…";
                previewHeading.label.textContent = "Preview, file size: calculating…";
                try {
                    const format = this.find(formatSelect.value);
                    const blob = await options.encode(format.id, selectedOptions());
                    if (closed || ownGeneration !== generation) return;
                    currentBlob = blob;
                    let displayBlob = blob;
                    if (!["png", "jpeg", "webp", "gif", "bmp", "avif"].includes(format.id)) {
                        displayBlob = await ImageEncoder.canvasToBlob(canvas, "image/png");
                    }
                    if (closed || ownGeneration !== generation) return;
                    if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
                    previewUrl = URL.createObjectURL(displayBlob);
                    preview.src = previewUrl;
                    previewHeading.label.textContent = "Preview, file size: " + formatSize(blob.size);
                    status.textContent = "";
                    ok.disabled = false;
                } catch (error) {
                    if (closed || ownGeneration !== generation) return;
                    currentBlob = null;
                    status.textContent = error.message;
                    previewHeading.label.textContent = "Preview unavailable";
                }
            };
            const scheduleRender = () => {
                if (timer !== null) clearTimeout(timer);
                timer = setTimeout(() => {
                    timer = null;
                    renderPromise = render();
                }, 100);
            };
            const finish = value => {
                if (closed) return;
                closed = true;
                ++generation;
                if (timer !== null) clearTimeout(timer);
                document.removeEventListener("keydown", onKeyDown, true);
                resizeObserver.disconnect();
                if (mover !== null) mover.destroy();
                if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
                backdrop.remove();
                resolve(value);
            };
            const onKeyDown = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(null);
                } else if (event.ctrlKey && event.key === "0") {
                    event.preventDefault();
                    fitPreview();
                } else if (event.ctrlKey && event.key === "1") {
                    event.preventDefault();
                    setZoom(1);
                }
            };
            const syncQuality = source => {
                setQuality(source.value);
                scheduleRender();
            };
            quality.oninput = () => syncQuality(quality);
            qualityNumber.oninput = () => syncQuality(qualityNumber);
            chroma.onchange = scheduleRender;
            formatSelect.onchange = () => {
                refreshControls();
                scheduleRender();
            };
            defaults.onclick = () => {
                const format = this.find(formatSelect.value);
                if (format.quality !== undefined) setQuality(format.quality);
                if (format.id === "jpeg") chroma.value = "4:2:0";
                scheduleRender();
            };
            close.onclick = cancel.onclick = () => finish(null);
            backdrop.onclick = event => {
                if (event.target === backdrop) finish(null);
            };
            dialog.onsubmit = async event => {
                event.preventDefault();
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                    renderPromise = render();
                }
                await renderPromise;
                if (currentBlob === null || closed) return;
                finish({format: formatSelect.value, options: selectedOptions(), blob: currentBlob});
            };

            dialog.append(titleBar, content, footer);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            formatSelect.value = initialFormat.id;
            chroma.value = initialOptions.subsampling || "4:2:0";
            refreshControls();
            renderPromise = render();
        });
    }

    static heading(text) {
        const heading = document.createElement("div");
        heading.className = "save-config-section-heading";
        const label = document.createElement("strong");
        label.textContent = text;
        const line = document.createElement("span");
        heading.append(label, line);
        heading.label = label;
        return heading;
    }
}

SaveImageDialog.activePromise = null;
