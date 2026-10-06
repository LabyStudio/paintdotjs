class NewFileDialog {

    static open(initialWidth = 800, initialHeight = 600) {
        if (this.activePromise !== null) return this.activePromise;
        this.activePromise = this.show(initialWidth, initialHeight).finally(() => {
            this.activePromise = null;
        });
        return this.activePromise;
    }

    static show(initialWidth, initialHeight) {
        return new Promise(resolve => {
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop";
            if (isApp) backdrop.classList.add("dialog-backdrop-app");
            const dialog = document.createElement("form");
            dialog.className = "app-dialog new-file-dialog";

            const titleBar = document.createElement("header");
            titleBar.className = "app-dialog-title-bar";
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            const icon = document.createElement("img");
            icon.src = "assets/icons/menu_file_new_icon.png";
            icon.alt = "";
            const title = document.createElement("strong");
            title.textContent = "New";
            titleGroup.append(icon, title);
            const close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            close.title = "Close";
            titleBar.append(titleGroup, close);

            const content = document.createElement("div");
            content.className = "new-file-content";
            const sizeSummary = document.createElement("strong");
            sizeSummary.className = "new-file-size-summary";
            const aspectLabel = document.createElement("label");
            aspectLabel.className = "new-file-aspect";
            const aspect = document.createElement("input");
            aspect.type = "checkbox";
            aspectLabel.append(aspect, document.createTextNode("Maintain aspect ratio"));

            const pixelSection = this.section("Pixel size");
            const width = this.numberRow("Width:", initialWidth, "pixels");
            const height = this.numberRow("Height:", initialHeight, "pixels");
            const resolution = this.numberRow("Resolution:", 96, "pixels/inch", 0.01);
            pixelSection.body.append(width.row, height.row, resolution.row);

            const printSection = this.section("Print size");
            const printWidth = this.numberRow("Width:", (initialWidth / 96).toFixed(2), "inches", 0.01);
            const printHeight = this.numberRow("Height:", (initialHeight / 96).toFixed(2), "inches", 0.01);
            printSection.body.append(printWidth.row, printHeight.row);
            content.append(sizeSummary, aspectLabel, pixelSection.element, printSection.element);

            const footer = document.createElement("footer");
            footer.className = "app-dialog-footer new-file-footer";
            const spacer = document.createElement("span");
            const buttons = document.createElement("div");
            const ok = document.createElement("button");
            ok.type = "submit";
            ok.textContent = "OK";
            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.textContent = "Cancel";
            buttons.append(ok, cancel);
            footer.append(spacer, buttons);

            let mover = null;
            let ratio = initialWidth / initialHeight;
            let syncing = false;
            const clampDimension = value => Math.max(1, Math.min(32768, Math.round(Number(value) || 1)));
            const update = source => {
                if (syncing) return;
                syncing = true;
                let w = clampDimension(width.input.value);
                let h = clampDimension(height.input.value);
                let dpi = Math.max(0.01, Number(resolution.input.value) || 96);
                if (aspect.checked) {
                    if (source === width.input) h = clampDimension(w / ratio);
                    if (source === height.input) w = clampDimension(h * ratio);
                } else {
                    ratio = w / h;
                }
                width.input.value = w;
                height.input.value = h;
                printWidth.input.value = (w / dpi).toFixed(2);
                printHeight.input.value = (h / dpi).toFixed(2);
                sizeSummary.textContent = "New size: " + Math.max(0.1, w * h * 4 / 1024 / 1024).toFixed(1) + " MB";
                syncing = false;
            };
            const updateFromPrint = source => {
                if (syncing) return;
                syncing = true;
                const dpi = Math.max(0.01, Number(resolution.input.value) || 96);
                let w = clampDimension(Number(printWidth.input.value) * dpi);
                let h = clampDimension(Number(printHeight.input.value) * dpi);
                if (aspect.checked) {
                    if (source === printWidth.input) h = clampDimension(w / ratio);
                    if (source === printHeight.input) w = clampDimension(h * ratio);
                } else {
                    ratio = w / h;
                }
                width.input.value = w;
                height.input.value = h;
                printWidth.input.value = (w / dpi).toFixed(2);
                printHeight.input.value = (h / dpi).toFixed(2);
                sizeSummary.textContent = "New size: " + Math.max(0.1, w * h * 4 / 1024 / 1024).toFixed(1) + " MB";
                syncing = false;
            };
            for (const input of [width.input, height.input, resolution.input]) {
                input.addEventListener("input", () => update(input));
            }
            for (const input of [printWidth.input, printHeight.input]) {
                input.addEventListener("input", () => updateFromPrint(input));
            }
            aspect.onchange = () => {
                ratio = clampDimension(width.input.value) / clampDimension(height.input.value);
            };

            let closed = false;
            const onKeyDown = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(null);
                }
            };
            const finish = value => {
                if (closed) return;
                closed = true;
                document.removeEventListener("keydown", onKeyDown, true);
                if (mover !== null) mover.destroy();
                backdrop.remove();
                resolve(value);
            };
            close.onclick = () => finish(null);
            cancel.onclick = () => finish(null);
            backdrop.onclick = event => {
                if (event.target === backdrop) finish(null);
            };
            dialog.onsubmit = event => {
                event.preventDefault();
                finish({
                    width: clampDimension(width.input.value),
                    height: clampDimension(height.input.value),
                    resolution: Math.max(0.01, Number(resolution.input.value) || 96)
                });
            };

            dialog.append(titleBar, content, footer);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            update(width.input);
            width.input.select();
        });
    }

    static section(title) {
        const element = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.textContent = title;
        const body = document.createElement("div");
        body.className = "new-file-section-body";
        element.append(legend, body);
        return {element, body};
    }

    static numberRow(labelText, value, unit, step = 1) {
        const row = document.createElement("label");
        row.className = "new-file-row";
        const label = document.createElement("span");
        label.textContent = labelText;
        const input = document.createElement("input");
        input.type = "number";
        input.min = step;
        input.max = 32768;
        input.step = step;
        input.value = value;
        const suffix = document.createElement("span");
        suffix.textContent = unit;
        row.append(label, input, suffix);
        return {row, input};
    }
}

NewFileDialog.activePromise = null;
