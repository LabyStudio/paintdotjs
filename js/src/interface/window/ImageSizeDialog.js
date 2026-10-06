class ImageSizeDialog {

    static open(mode, options) {
        if (this.activePromise !== null) return this.activePromise;
        this.activePromise = this.show(mode, options).finally(() => {
            this.activePromise = null;
        });
        return this.activePromise;
    }

    static show(mode, options) {
        return new Promise(resolve => {
            const isResize = mode === "resize";
            const originalWidth = this.clampDimension(options.width);
            const originalHeight = this.clampDimension(options.height);
            const originalResolution = Math.max(0.01, Number(options.resolution) || 96);
            const layerCount = Math.max(1, Number(options.layerCount) || 1);
            const preferences = this.loadPreferences();

            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop image-size-backdrop";
            if (isApp) backdrop.classList.add("dialog-backdrop-app");
            const dialog = document.createElement("form");
            dialog.className = "app-dialog image-size-dialog "
                + (isResize ? "image-resize-dialog" : "canvas-size-dialog");

            const titleBar = document.createElement("header");
            titleBar.className = "app-dialog-title-bar";
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            const icon = document.createElement("img");
            icon.src = "assets/icons/menu_image_" + (isResize ? "resize" : "canvas_size") + "_icon.png";
            icon.alt = "";
            const title = document.createElement("strong");
            title.textContent = isResize ? "Resize" : "Canvas Size";
            titleGroup.append(icon, title);
            const close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            close.title = "Close";
            titleBar.append(titleGroup, close);

            const content = document.createElement("div");
            content.className = "image-size-content";
            const summary = document.createElement("strong");
            summary.className = "image-size-summary";

            const sizing = document.createElement("div");
            sizing.className = "image-size-sizing";
            const percentChoice = this.radio("image-size-mode", "percent", "By percentage:", false);
            const percentInput = this.numberInput(100, 0.01, 2000, 0.01);
            percentInput.disabled = true;
            percentInput.className = "image-size-percent";
            const percentSuffix = document.createElement("strong");
            percentSuffix.textContent = "%";
            const percentRow = document.createElement("div");
            percentRow.className = "image-size-choice-row";
            percentRow.append(percentChoice.label, percentInput, percentSuffix);
            const absoluteChoice = this.radio("image-size-mode", "absolute", "By absolute size:", true);
            const maintainLabel = document.createElement("label");
            maintainLabel.className = "image-size-maintain";
            const maintain = document.createElement("input");
            maintain.type = "checkbox";
            maintain.checked = isResize ? preferences.resizeMaintain : preferences.canvasMaintain;
            maintainLabel.append(maintain, document.createTextNode("Maintain aspect ratio"));
            sizing.append(percentRow, absoluteChoice.label, maintainLabel);

            const pixelSection = this.section("Pixel size");
            const width = this.numberRow("Width:", originalWidth, "pixels", 1, 32768, 1);
            const height = this.numberRow("Height:", originalHeight, "pixels", 1, 32768, 1);
            const resolution = this.numberRow("Resolution:", originalResolution.toFixed(2), null, 0.01, 100000, 0.01);
            const resolutionUnit = document.createElement("select");
            this.addOptions(resolutionUnit, [
                ["inch", "pixels/inch"],
                ["centimeter", "pixels/cm"]
            ]);
            resolutionUnit.value = preferences.resolutionUnit;
            resolution.row.appendChild(resolutionUnit);
            pixelSection.body.append(width.row, height.row, resolution.row);

            const printSection = this.section("Print size");
            const printWidth = this.numberRow("Width:", "", null, 0.01, 1000000, 0.01);
            const printUnit = document.createElement("select");
            this.addOptions(printUnit, [
                ["inches", "inches"],
                ["centimeters", "centimeters"]
            ]);
            printUnit.value = preferences.printUnit;
            printWidth.row.appendChild(printUnit);
            const printHeight = this.numberRow("Height:", "", null, 0.01, 1000000, 0.01);
            const printHeightUnit = document.createElement("span");
            printHeightUnit.className = "image-size-print-unit";
            printHeight.row.appendChild(printHeightUnit);
            printSection.body.append(printWidth.row, printHeight.row);

            const optionsSection = this.section("Options");
            let resampling = null;
            let gamma = null;
            let resetResampling = null;
            let anchor = null;
            let fill = null;
            if (isResize) {
                const resamplingRow = document.createElement("label");
                resamplingRow.className = "image-size-select-row image-size-resampling-row";
                const resamplingLabel = document.createElement("span");
                resamplingLabel.textContent = "Resampling:";
                resampling = document.createElement("select");
                this.addOptions(resampling, [
                    ["adaptiveHighQuality", "Adaptive (Sharp)"],
                    ["cubic", "Bicubic"],
                    ["cubicSmooth", "Bicubic (Smooth)"],
                    ["linear", "Bilinear"],
                    ["linearLowQuality", "Bilinear (Low Quality)"],
                    ["lanczos3", "Lanczos 3"],
                    ["fant", "Fant"],
                    ["nearestNeighbor", "Nearest Neighbor"]
                ]);
                resampling.value = preferences.resampling;
                resetResampling = document.createElement("button");
                resetResampling.type = "button";
                resetResampling.className = "image-size-reset";
                resetResampling.title = "Reset";
                const resetIcon = document.createElement("img");
                resetIcon.src = "assets/icons/reset_icon.png";
                resetIcon.alt = "";
                resetResampling.appendChild(resetIcon);
                resetResampling.onclick = () => {
                    resampling.value = "adaptiveHighQuality";
                    gamma.checked = true;
                };
                resamplingRow.append(resamplingLabel, resampling, resetResampling);

                const gammaLabel = document.createElement("label");
                gammaLabel.className = "image-size-gamma";
                gamma = document.createElement("input");
                gamma.type = "checkbox";
                gamma.checked = preferences.gammaCorrect;
                gammaLabel.append(gamma, document.createTextNode("Use gamma-correct resampling"));
                optionsSection.body.append(resamplingRow, gammaLabel);
            } else {
                const anchorRow = document.createElement("label");
                anchorRow.className = "image-size-select-row";
                const anchorLabel = document.createElement("span");
                anchorLabel.textContent = "Anchor:";
                anchor = document.createElement("select");
                const anchors = [
                    ["topLeft", "Top Left"], ["top", "Top"], ["topRight", "Top Right"],
                    ["left", "Left"], ["middle", "Center"], ["right", "Right"],
                    ["bottomLeft", "Bottom Left"], ["bottom", "Bottom"], ["bottomRight", "Bottom Right"]
                ];
                this.addOptions(anchor, anchors);
                anchor.value = preferences.anchor;
                anchorRow.append(anchorLabel, anchor);

                const anchorChooser = document.createElement("div");
                anchorChooser.className = "image-size-anchor-chooser";
                anchorChooser.setAttribute("role", "radiogroup");
                const anchorButtons = new Map();
                const positions = [
                    ["topLeft", 0, 0], ["top", 1, 0], ["topRight", 2, 0],
                    ["left", 0, 1], ["middle", 1, 1], ["right", 2, 1],
                    ["bottomLeft", 0, 2], ["bottom", 1, 2], ["bottomRight", 2, 2]
                ];
                const names = new Map(anchors);
                for (const [value, x, y] of positions) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.dataset.anchor = value;
                    button.dataset.x = String(x);
                    button.dataset.y = String(y);
                    button.title = names.get(value);
                    button.setAttribute("aria-label", names.get(value));
                    button.setAttribute("role", "radio");
                    button.onclick = () => {
                        anchor.value = value;
                        updateAnchorChooser();
                    };
                    anchorButtons.set(value, button);
                    anchorChooser.appendChild(button);
                }
                const arrows = [
                    ["↖", "↑", "↗"],
                    ["←", "", "→"],
                    ["↙", "↓", "↘"]
                ];
                const updateAnchorChooser = () => {
                    const selectedButton = anchorButtons.get(anchor.value);
                    const selectedX = Number(selectedButton.dataset.x);
                    const selectedY = Number(selectedButton.dataset.y);
                    for (const button of anchorButtons.values()) {
                        const selected = button === selectedButton;
                        const dx = Number(button.dataset.x) - selectedX;
                        const dy = Number(button.dataset.y) - selectedY;
                        button.classList.toggle("selected", selected);
                        button.setAttribute("aria-checked", String(selected));
                        button.replaceChildren();
                        if (selected) {
                            const image = document.createElement("img");
                            image.src = "assets/icons/menu_image_canvas_size_icon.png";
                            image.alt = "";
                            button.appendChild(image);
                        } else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                            button.textContent = arrows[dy + 1][dx + 1];
                        }
                    }
                };
                anchor.onchange = updateAnchorChooser;
                updateAnchorChooser();

                const fillRow = document.createElement("label");
                fillRow.className = "image-size-select-row image-size-fill-row";
                const fillLabel = document.createElement("span");
                fillLabel.textContent = "Fill:";
                fill = document.createElement("select");
                this.addOptions(fill, [
                    ["transparent", "Transparent"], ["primary", "Primary color"],
                    ["secondary", "Secondary color"], ["white", "White"], ["black", "Black"]
                ]);
                fill.value = preferences.fill;
                fillRow.append(fillLabel, fill);
                optionsSection.body.append(anchorRow, anchorChooser, fillRow);
            }

            content.append(summary, sizing, pixelSection.element, printSection.element, optionsSection.element);

            const footer = document.createElement("footer");
            footer.className = "app-dialog-footer image-size-footer";
            const buttons = document.createElement("div");
            const ok = document.createElement("button");
            ok.type = "submit";
            ok.textContent = "OK";
            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.textContent = "Cancel";
            buttons.append(ok, cancel);
            footer.appendChild(buttons);

            let syncing = false;
            let dpi = originalResolution;
            const ratio = originalWidth / originalHeight;
            const usingPercentage = () => percentChoice.input.checked;
            const getDimensions = () => ({
                width: this.clampDimension(width.input.value),
                height: this.clampDimension(height.input.value)
            });
            const printScale = () => printUnit.value === "centimeters" ? 2.54 : 1;
            const updateSummary = () => {
                const dimensions = getDimensions();
                const mib = dimensions.width * dimensions.height * layerCount * 4 / 1024 / 1024;
                summary.textContent = `New size: ${Math.max(0.1, mib).toFixed(1).replace(".", ",")} MB`;
                ok.disabled = dimensions.width === originalWidth
                    && dimensions.height === originalHeight
                    && Math.abs(dpi - originalResolution) < 0.0001;
            };
            const updatePrintFields = () => {
                const dimensions = getDimensions();
                const scale = printScale();
                printWidth.input.value = (dimensions.width / dpi * scale).toFixed(2);
                printHeight.input.value = (dimensions.height / dpi * scale).toFixed(2);
                printHeightUnit.textContent = printUnit.options[printUnit.selectedIndex].text;
            };
            const updateResolutionField = () => {
                const displayed = resolutionUnit.value === "centimeter" ? dpi / 2.54 : dpi;
                resolution.input.value = displayed.toFixed(2);
            };
            const finishUpdate = () => {
                updatePrintFields();
                updateSummary();
            };
            const updateDimension = source => {
                if (syncing || usingPercentage()) return;
                syncing = true;
                let dimensions = getDimensions();
                if (maintain.checked) {
                    if (source === width.input) dimensions.height = this.clampDimension(dimensions.width / ratio);
                    else dimensions.width = this.clampDimension(dimensions.height * ratio);
                }
                width.input.value = dimensions.width;
                height.input.value = dimensions.height;
                percentInput.value = (dimensions.width / originalWidth * 100).toFixed(2);
                finishUpdate();
                syncing = false;
            };
            const updatePercentage = () => {
                if (syncing || !usingPercentage()) return;
                syncing = true;
                const percentage = Math.max(0.01, Math.min(2000, Number(percentInput.value) || 100));
                width.input.value = this.clampDimension(originalWidth * percentage / 100);
                height.input.value = this.clampDimension(originalHeight * percentage / 100);
                finishUpdate();
                syncing = false;
            };
            const updatePrintDimension = source => {
                if (syncing || usingPercentage()) return;
                syncing = true;
                const scale = printScale();
                let newWidth = this.clampDimension(Number(printWidth.input.value) / scale * dpi);
                let newHeight = this.clampDimension(Number(printHeight.input.value) / scale * dpi);
                if (maintain.checked) {
                    if (source === printWidth.input) newHeight = this.clampDimension(newWidth / ratio);
                    else newWidth = this.clampDimension(newHeight * ratio);
                }
                width.input.value = newWidth;
                height.input.value = newHeight;
                percentInput.value = (newWidth / originalWidth * 100).toFixed(2);
                updatePrintFields();
                updateSummary();
                syncing = false;
            };
            const updateResolution = () => {
                if (syncing) return;
                syncing = true;
                const displayed = Math.max(0.01, Number(resolution.input.value) || 96);
                dpi = resolutionUnit.value === "centimeter" ? displayed * 2.54 : displayed;
                updatePrintFields();
                updateSummary();
                syncing = false;
            };
            const updateMode = () => {
                const percentage = usingPercentage();
                percentInput.disabled = !percentage;
                const absoluteControls = [
                    width.input,
                    height.input,
                    resolution.input,
                    resolutionUnit,
                    printWidth.input,
                    printHeight.input,
                    printUnit,
                    maintain
                ];
                for (const control of absoluteControls) control.disabled = percentage;
                pixelSection.body.classList.toggle("image-size-disabled", percentage);
                printSection.body.classList.toggle("image-size-disabled", percentage);
                maintainLabel.classList.toggle("image-size-disabled", percentage);
                if (percentage) {
                    updatePercentage();
                    percentInput.select();
                } else {
                    width.input.select();
                }
            };

            width.input.addEventListener("input", () => updateDimension(width.input));
            height.input.addEventListener("input", () => updateDimension(height.input));
            printWidth.input.addEventListener("input", () => updatePrintDimension(printWidth.input));
            printHeight.input.addEventListener("input", () => updatePrintDimension(printHeight.input));
            percentInput.addEventListener("input", updatePercentage);
            resolution.input.addEventListener("input", updateResolution);
            resolutionUnit.onchange = () => {
                updateResolutionField();
                updatePrintFields();
            };
            printUnit.onchange = updatePrintFields;
            absoluteChoice.input.addEventListener("change", updateMode);
            percentChoice.input.addEventListener("change", updateMode);
            maintain.addEventListener("change", () => updateDimension(width.input));

            let mover = null;
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
            dialog.onsubmit = event => {
                event.preventDefault();
                const dimensions = getDimensions();
                const result = {
                    width: dimensions.width,
                    height: dimensions.height,
                    resolution: dpi,
                    maintainAspect: maintain.checked,
                    resolutionUnit: resolutionUnit.value,
                    printUnit: printUnit.value
                };
                if (isResize) {
                    result.resampling = resampling.value;
                    result.gammaCorrect = gamma.checked;
                } else {
                    result.anchor = anchor.value;
                    result.fill = fill.value;
                }
                this.savePreferences(mode, result);
                finish(result);
            };

            dialog.append(titleBar, content, footer);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            updateResolutionField();
            updatePrintFields();
            updateSummary();
            width.input.select();
        });
    }

    static section(title) {
        const element = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.textContent = title;
        const body = document.createElement("div");
        body.className = "image-size-section-body";
        element.append(legend, body);
        return {element, body};
    }

    static numberRow(labelText, value, suffixText, min, max, step) {
        const row = document.createElement("label");
        row.className = "image-size-row";
        const label = document.createElement("span");
        label.textContent = labelText;
        const input = this.numberInput(value, min, max, step);
        row.append(label, input);
        if (suffixText !== null) {
            const suffix = document.createElement("span");
            suffix.textContent = suffixText;
            row.appendChild(suffix);
        }
        return {row, input};
    }

    static numberInput(value, min, max, step) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(value);
        return input;
    }

    static radio(name, value, text, checked) {
        const label = document.createElement("label");
        label.className = "image-size-radio";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = value;
        input.checked = checked;
        label.append(input, document.createTextNode(text));
        return {label, input};
    }

    static addOptions(select, options) {
        for (const [value, text] of options) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        }
    }

    static clampDimension(value) {
        return Math.max(1, Math.min(32768, Math.round(Number(value) || 1)));
    }

    static loadPreferences() {
        const defaults = {
            resizeMaintain: false,
            canvasMaintain: false,
            resampling: "adaptiveHighQuality",
            gammaCorrect: true,
            anchor: "top",
            fill: "transparent",
            resolutionUnit: "inch",
            printUnit: "inches"
        };
        try {
            const preferences = Object.assign(
                defaults,
                JSON.parse(localStorage.getItem(this.storageKey) || "{}")
            );
            preferences.resampling = {
                high: "adaptiveHighQuality",
                medium: "linear",
                low: "linearLowQuality",
                nearest: "nearestNeighbor"
            }[preferences.resampling] || preferences.resampling;
            return preferences;
        } catch (_) {
            return defaults;
        }
    }

    static savePreferences(mode, result) {
        const preferences = this.loadPreferences();
        preferences.resolutionUnit = result.resolutionUnit;
        preferences.printUnit = result.printUnit;
        if (mode === "resize") {
            preferences.resizeMaintain = result.maintainAspect;
            preferences.resampling = result.resampling;
            preferences.gammaCorrect = result.gammaCorrect;
        } else {
            preferences.canvasMaintain = result.maintainAspect;
            preferences.anchor = result.anchor;
            preferences.fill = result.fill;
        }
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(preferences));
        } catch (_) {
            // Preferences are optional in restricted browser contexts.
        }
    }
}

ImageSizeDialog.activePromise = null;
ImageSizeDialog.storageKey = "paintdotjs.imageSize.v1";
