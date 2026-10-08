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

class ImageSizeDialog {

    static open(mode, options) {
        if (this.activePromise !== null) {
            return this.activePromise;
        }
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
            if (isApp) {
                backdrop.classList.add("dialog-backdrop-app");
            }
            const dialog = document.createElement("form");
            dialog.className = "app-dialog image-size-dialog "
                + (isResize ? "image-resize-dialog" : "canvas-size-dialog");
            const {element: titleBar, close} = this.createTitleBar(isResize);

            const controls = this.createContent(
                isResize,
                originalWidth,
                originalHeight,
                originalResolution,
                preferences
            );
            const {
                element: content,
                summary,
                percentChoice,
                percentInput,
                absoluteChoice,
                maintainLabel,
                maintain,
                pixelSection,
                width,
                height,
                resolution,
                resolutionUnit,
                printSection,
                printWidth,
                printHeight,
                printUnit,
                printHeightUnit,
                resampling,
                gamma,
                anchor,
                fill
            } = controls;
            const {element: footer, ok, cancel} = this.createFooter();

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
                if (syncing || usingPercentage()) {
                    return;
                }
                syncing = true;
                let dimensions = getDimensions();
                if (maintain.checked) {
                    if (source === width.input) {
                        dimensions.height = this.clampDimension(dimensions.width / ratio);
                    }
                    else {
                        dimensions.width = this.clampDimension(dimensions.height * ratio);
                    }
                }
                width.input.value = dimensions.width;
                height.input.value = dimensions.height;
                percentInput.value = (dimensions.width / originalWidth * 100).toFixed(2);
                finishUpdate();
                syncing = false;
            };
            const updatePercentage = () => {
                if (syncing || !usingPercentage()) {
                    return;
                }
                syncing = true;
                const percentage = Math.max(0.01, Math.min(2000, Number(percentInput.value) || 100));
                width.input.value = this.clampDimension(originalWidth * percentage / 100);
                height.input.value = this.clampDimension(originalHeight * percentage / 100);
                finishUpdate();
                syncing = false;
            };
            const updatePrintDimension = source => {
                if (syncing || usingPercentage()) {
                    return;
                }
                syncing = true;
                const scale = printScale();
                let newWidth = this.clampDimension(Number(printWidth.input.value) / scale * dpi);
                let newHeight = this.clampDimension(Number(printHeight.input.value) / scale * dpi);
                if (maintain.checked) {
                    if (source === printWidth.input) {
                        newHeight = this.clampDimension(newWidth / ratio);
                    }
                    else {
                        newWidth = this.clampDimension(newHeight * ratio);
                    }
                }
                width.input.value = newWidth;
                height.input.value = newHeight;
                percentInput.value = (newWidth / originalWidth * 100).toFixed(2);
                updatePrintFields();
                updateSummary();
                syncing = false;
            };
            const updateResolution = () => {
                if (syncing) {
                    return;
                }
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
                for (const control of absoluteControls) {
                    control.disabled = percentage;
                }
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
                if (closed) {
                    return;
                }
                closed = true;
                document.removeEventListener("keydown", onKeyDown, true);
                if (mover !== null) {
                    mover.destroy();
                }
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

    static createContent(isResize, widthValue, heightValue, resolutionValue, preferences) {
        const content = document.createElement("div");
        content.className = "image-size-content";
        let summary = null;
        let sizing = null;
        let pixelSection = null;
        let printSection = null;
        let optionsSection = null;
        {
            // Summary
            summary = document.createElement("strong");
            summary.className = "image-size-summary";

            // Sizing mode
            sizing = this.createSizingControls(isResize, preferences);

            // Pixel size
            pixelSection = this.createPixelSizeControls(widthValue, heightValue, resolutionValue, preferences);

            // Print size
            printSection = this.createPrintSizeControls(preferences);

            // Options
            optionsSection = isResize
                ? this.createResizeOptions(preferences)
                : this.createCanvasSizeOptions(preferences);
            content.append(
                summary,
                sizing.element,
                pixelSection.element,
                printSection.element,
                optionsSection.element
            );
        }
        return {
            element: content,
            summary,
            percentChoice: sizing.percentChoice,
            percentInput: sizing.percentInput,
            absoluteChoice: sizing.absoluteChoice,
            maintainLabel: sizing.maintainLabel,
            maintain: sizing.maintain,
            pixelSection,
            width: pixelSection.width,
            height: pixelSection.height,
            resolution: pixelSection.resolution,
            resolutionUnit: pixelSection.resolutionUnit,
            printSection,
            printWidth: printSection.printWidth,
            printHeight: printSection.printHeight,
            printUnit: printSection.printUnit,
            printHeightUnit: printSection.printHeightUnit,
            resampling: optionsSection.resampling,
            gamma: optionsSection.gamma,
            anchor: optionsSection.anchor,
            fill: optionsSection.fill
        };
    }

    static createSizingControls(isResize, preferences) {
        const sizing = document.createElement("div");
        sizing.className = "image-size-sizing";
        let percentChoice = null;
        let percentInput = null;
        let absoluteChoice = null;
        let maintainLabel = null;
        let maintain = null;
        {
            // Percentage
            const percentRow = document.createElement("div");
            percentRow.className = "image-size-choice-row";
            {
                percentChoice = this.radio("image-size-mode", "percent", "By percentage:", false);

                percentInput = this.numberInput(100, 0.01, 2000, 0.01);
                percentInput.disabled = true;
                percentInput.className = "image-size-percent";

                const suffix = document.createElement("strong");
                suffix.textContent = "%";
                percentRow.append(percentChoice.label, NumberInput.wrap(percentInput), suffix);
            }

            // Absolute size
            absoluteChoice = this.radio("image-size-mode", "absolute", "By absolute size:", true);

            // Aspect ratio
            maintainLabel = document.createElement("label");
            maintainLabel.className = "image-size-maintain";
            {
                maintain = document.createElement("input");
                maintain.type = "checkbox";
                maintain.checked = isResize ? preferences.resizeMaintain : preferences.canvasMaintain;
                maintainLabel.append(maintain, document.createTextNode("Maintain aspect ratio"));
            }
            sizing.append(percentRow, absoluteChoice.label, maintainLabel);
        }
        return {element: sizing, percentChoice, percentInput, absoluteChoice, maintainLabel, maintain};
    }

    static createPixelSizeControls(widthValue, heightValue, resolutionValue, preferences) {
        const section = this.section("Pixel size");
        let width = null;
        let height = null;
        let resolution = null;
        let resolutionUnit = null;
        {
            width = this.numberRow("Width:", widthValue, "pixels", 1, 32768, 1);
            height = this.numberRow("Height:", heightValue, "pixels", 1, 32768, 1);
            resolution = this.numberRow(
                "Resolution:",
                resolutionValue.toFixed(2),
                null,
                0.01,
                100000,
                0.01
            );
            {
                resolutionUnit = document.createElement("select");
                this.addOptions(resolutionUnit, [
                    ["inch", "pixels/inch"],
                    ["centimeter", "pixels/cm"]
                ]);
                resolutionUnit.value = preferences.resolutionUnit;
                resolution.row.appendChild(resolutionUnit);
            }
            section.body.append(width.row, height.row, resolution.row);
        }
        return {element: section.element, body: section.body, width, height, resolution, resolutionUnit};
    }

    static createPrintSizeControls(preferences) {
        const section = this.section("Print size");
        let printWidth = null;
        let printHeight = null;
        let printUnit = null;
        let printHeightUnit = null;
        {
            // Width
            printWidth = this.numberRow("Width:", "", null, 0.01, 1000000, 0.01);
            {
                printUnit = document.createElement("select");
                this.addOptions(printUnit, [
                    ["inches", "inches"],
                    ["centimeters", "centimeters"]
                ]);
                printUnit.value = preferences.printUnit;
                printWidth.row.appendChild(printUnit);
            }

            // Height
            printHeight = this.numberRow("Height:", "", null, 0.01, 1000000, 0.01);
            {
                printHeightUnit = document.createElement("span");
                printHeightUnit.className = "image-size-print-unit";
                printHeight.row.appendChild(printHeightUnit);
            }
            section.body.append(printWidth.row, printHeight.row);
        }
        return {element: section.element, body: section.body, printWidth, printHeight, printUnit, printHeightUnit};
    }

    static createResizeOptions(preferences) {
        const section = this.section("Options");
        let resampling = null;
        let gamma = null;
        {
            // Resampling
            const resamplingRow = document.createElement("label");
            resamplingRow.className = "image-size-select-row image-size-resampling-row";
            {
                const label = document.createElement("span");
                label.textContent = "Resampling:";

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

                const reset = document.createElement("button");
                reset.type = "button";
                reset.className = "image-size-reset";
                reset.title = "Reset";
                {
                    const icon = document.createElement("img");
                    icon.src = "assets/icons/reset_icon.png";
                    icon.alt = "";
                    reset.appendChild(icon);
                }
                reset.onclick = () => {
                    resampling.value = "adaptiveHighQuality";
                    gamma.checked = true;
                };
                resamplingRow.append(label, resampling, reset);
            }

            // Gamma correction
            const gammaLabel = document.createElement("label");
            gammaLabel.className = "image-size-gamma";
            {
                gamma = document.createElement("input");
                gamma.type = "checkbox";
                gamma.checked = preferences.gammaCorrect;
                gammaLabel.append(gamma, document.createTextNode("Use gamma-correct resampling"));
            }
            section.body.append(resamplingRow, gammaLabel);
        }
        return {element: section.element, resampling, gamma, anchor: null, fill: null};
    }

    static createCanvasSizeOptions(preferences) {
        const section = this.section("Options");
        let anchor = null;
        let fill = null;
        {
            // Anchor selection
            const anchorRow = document.createElement("label");
            anchorRow.className = "image-size-select-row";
            const anchors = [
                ["topLeft", "Top Left"], ["top", "Top"], ["topRight", "Top Right"],
                ["left", "Left"], ["middle", "Center"], ["right", "Right"],
                ["bottomLeft", "Bottom Left"], ["bottom", "Bottom"], ["bottomRight", "Bottom Right"]
            ];
            {
                const label = document.createElement("span");
                label.textContent = "Anchor:";

                anchor = document.createElement("select");
                this.addOptions(anchor, anchors);
                anchor.value = preferences.anchor;
                anchorRow.append(label, anchor);
            }

            // Anchor chooser
            const anchorChooser = this.createAnchorChooser(anchor, anchors);

            // Fill
            const fillRow = document.createElement("label");
            fillRow.className = "image-size-select-row image-size-fill-row";
            {
                const label = document.createElement("span");
                label.textContent = "Fill:";

                fill = document.createElement("select");
                this.addOptions(fill, [
                    ["transparent", "Transparent"],
                    ["primary", "Primary color"],
                    ["secondary", "Secondary color"],
                    ["white", "White"],
                    ["black", "Black"]
                ]);
                fill.value = preferences.fill;
                fillRow.append(label, fill);
            }
            section.body.append(anchorRow, anchorChooser, fillRow);
        }
        return {element: section.element, resampling: null, gamma: null, anchor, fill};
    }

    static createAnchorChooser(anchor, anchors) {
        const chooser = document.createElement("div");
        chooser.className = "image-size-anchor-chooser";
        chooser.setAttribute("role", "radiogroup");
        {
            const buttons = new Map();
            const names = new Map(anchors);
            const positions = [
                ["topLeft", 0, 0], ["top", 1, 0], ["topRight", 2, 0],
                ["left", 0, 1], ["middle", 1, 1], ["right", 2, 1],
                ["bottomLeft", 0, 2], ["bottom", 1, 2], ["bottomRight", 2, 2]
            ];
            const update = () => {
                const selectedButton = buttons.get(anchor.value);
                const selectedX = Number(selectedButton.dataset.x);
                const selectedY = Number(selectedButton.dataset.y);
                for (const button of buttons.values()) {
                    const selected = button === selectedButton;
                    const dx = Number(button.dataset.x) - selectedX;
                    const dy = Number(button.dataset.y) - selectedY;
                    button.classList.toggle("selected", selected);
                    button.setAttribute("aria-checked", String(selected));
                    button.replaceChildren();
                    if (selected) {
                        const image = document.createElement("img");
                        image.src = "assets/images/anchor_chooser_control_anchor_image.png";
                        image.alt = "";
                        button.appendChild(image);
                    } else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                        button.appendChild(this.createAnchorArrow(dx, dy));
                    }
                }
            };

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
                    update();
                };
                buttons.set(value, button);
                chooser.appendChild(button);
            }
            anchor.onchange = update;
            update();
        }
        return chooser;
    }

    static createAnchorArrow(dx, dy) {
        const namespace = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(namespace, "svg");
        svg.classList.add("image-size-anchor-arrow");
        svg.setAttribute("viewBox", "0 0 28 28");
        svg.setAttribute("aria-hidden", "true");
        {
            const length = Math.hypot(dx, dy);
            const ux = dx / length;
            const uy = dy / length;
            const x1 = 14 - 7 * dx;
            const y1 = 14 - 7 * dy;
            const x2 = x1 + 14 * ux;
            const y2 = y1 + 14 * uy;
            const baseX = x2 - 6 * ux;
            const baseY = y2 - 6 * uy;
            const perpendicularX = -uy * 3;
            const perpendicularY = ux * 3;

            const line = document.createElementNS(namespace, "line");
            line.setAttribute("x1", String(x1));
            line.setAttribute("y1", String(y1));
            line.setAttribute("x2", String(x2));
            line.setAttribute("y2", String(y2));

            const head = document.createElementNS(namespace, "polygon");
            head.setAttribute("points", [
                `${x2},${y2}`,
                `${baseX + perpendicularX},${baseY + perpendicularY}`,
                `${baseX - perpendicularX},${baseY - perpendicularY}`
            ].join(" "));
            svg.append(line, head);
        }
        return svg;
    }

    static createTitleBar(isResize) {
        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar";
        let close = null;
        {
            // Title
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            {
                const icon = document.createElement("img");
                icon.src = "assets/icons/menu_image_" + (isResize ? "resize" : "canvas_size") + "_icon.png";
                icon.alt = "";

                const title = document.createElement("strong");
                title.textContent = isResize ? "Resize" : "Canvas Size";
                titleGroup.append(icon, title);
            }

            // Close button
            close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            close.title = "Close";
            titleBar.append(titleGroup, close);
        }
        return {element: titleBar, close};
    }

    static createFooter() {
        const footer = document.createElement("footer");
        footer.className = "app-dialog-footer image-size-footer";
        let ok = null;
        let cancel = null;
        {
            const buttons = document.createElement("div");
            {
                ok = document.createElement("button");
                ok.type = "submit";
                ok.textContent = "OK";

                cancel = document.createElement("button");
                cancel.type = "button";
                cancel.textContent = "Cancel";
                buttons.append(ok, cancel);
            }
            footer.appendChild(buttons);
        }
        return {element: footer, ok, cancel};
    }

    static section(title) {
        const element = document.createElement("fieldset");
        let body = null;
        {
            // Heading
            const legend = document.createElement("legend");
            legend.textContent = title;

            // Fields
            body = document.createElement("div");
            body.className = "image-size-section-body";
            element.append(legend, body);
        }
        return {element, body};
    }

    static numberRow(labelText, value, suffixText, min, max, step) {
        const row = document.createElement("label");
        row.className = "image-size-row";
        let input = null;
        {
            // Label
            const label = document.createElement("span");
            label.textContent = labelText;

            // Value
            input = this.numberInput(value, min, max, step);
            row.append(label, NumberInput.wrap(input));

            // Unit
            if (suffixText !== null) {
                const suffix = document.createElement("span");
                suffix.textContent = suffixText;
                row.appendChild(suffix);
            }
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
        let input = null;
        {
            input = document.createElement("input");
            input.type = "radio";
            input.name = name;
            input.value = value;
            input.checked = checked;
            label.append(input, document.createTextNode(text));
        }
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
