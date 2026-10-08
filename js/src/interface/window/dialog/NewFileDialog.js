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

class NewFileDialog {

    static open(initialWidth = 800, initialHeight = 600) {
        if (this.activePromise !== null) {
            return this.activePromise;
        }
        this.activePromise = this.show(initialWidth, initialHeight).finally(() => {
            this.activePromise = null;
        });
        return this.activePromise;
    }

    static show(initialWidth, initialHeight) {
        return new Promise(resolve => {
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop";
            if (isApp) {
                backdrop.classList.add("dialog-backdrop-app");
            }
            const dialog = document.createElement("form");
            dialog.className = "app-dialog new-file-dialog";
            const {element: titleBar, close} = this.createTitleBar();
            const content = this.createContent(initialWidth, initialHeight);
            const {element: footer, cancel} = this.createFooter();
            const {update, clampDimension} = this.bindSizeSynchronization(content, initialWidth, initialHeight);

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
            backdrop.onclick = event => {
                if (event.target === backdrop) {
                    finish(null);
                }
            };
            dialog.onsubmit = event => {
                event.preventDefault();
                if (typeof AppSettingsStore !== "undefined") {
                    AppSettingsStore.set("workspace.newFileMaintainAspectRatio", content.aspect.checked);
                }
                finish({
                    width: clampDimension(content.width.input.value),
                    height: clampDimension(content.height.input.value),
                    resolution: Math.max(0.01, Number(content.resolution.input.value) || 96)
                });
            };

            dialog.append(titleBar, content.element, footer);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            update(content.width.input);
            content.width.input.select();
        });
    }

    static createContent(initialWidth, initialHeight) {
        const content = document.createElement("div");
        content.className = "new-file-content";
        const controls = {element: content};
        {
            // Size summary
            controls.sizeSummary = document.createElement("strong");
            controls.sizeSummary.className = "new-file-size-summary";

            // Aspect ratio
            const aspectLabel = document.createElement("label");
            aspectLabel.className = "new-file-aspect";
            {
                controls.aspect = document.createElement("input");
                controls.aspect.type = "checkbox";
                controls.aspect.checked = typeof AppSettingsStore !== "undefined"
                    && AppSettingsStore.get("workspace.newFileMaintainAspectRatio", false) === true;
                aspectLabel.append(controls.aspect, document.createTextNode("Maintain aspect ratio"));
            }

            // Pixel size
            const pixelSection = this.section("Pixel size");
            {
                controls.width = this.numberRow("Width:", initialWidth, "pixels");
                controls.height = this.numberRow("Height:", initialHeight, "pixels");
                controls.resolution = this.numberRow("Resolution:", 96, "pixels/inch", 0.01);
                pixelSection.body.append(
                    controls.width.row,
                    controls.height.row,
                    controls.resolution.row
                );
            }

            // Print size
            const printSection = this.section("Print size");
            {
                controls.printWidth = this.numberRow(
                    "Width:", (initialWidth / 96).toFixed(2), "inches", 0.01);
                controls.printHeight = this.numberRow(
                    "Height:", (initialHeight / 96).toFixed(2), "inches", 0.01);
                printSection.body.append(controls.printWidth.row, controls.printHeight.row);
            }

            content.append(controls.sizeSummary, aspectLabel, pixelSection.element, printSection.element);
        }
        return controls;
    }

    static bindSizeSynchronization(controls, initialWidth, initialHeight) {
        const {width, height, resolution, printWidth, printHeight, aspect, sizeSummary} = controls;
        const clampDimension = value => Math.max(1, Math.min(32768, Math.round(Number(value) || 1)));
        let ratio = initialWidth / initialHeight;
        let syncing = false;

        const applyDimensions = (widthValue, heightValue, dpi) => {
            width.input.value = widthValue;
            height.input.value = heightValue;
            printWidth.input.value = (widthValue / dpi).toFixed(2);
            printHeight.input.value = (heightValue / dpi).toFixed(2);
            sizeSummary.textContent = "New size: "
                + Math.max(0.1, widthValue * heightValue * 4 / 1024 / 1024).toFixed(1) + " MB";
        };

        const maintainRatio = (source, widthSource, heightSource, dimensions) => {
            if (!aspect.checked) {
                ratio = dimensions.width / dimensions.height;
                return dimensions;
            }
            if (source === widthSource) {
                dimensions.height = clampDimension(dimensions.width / ratio);
            } else if (source === heightSource) {
                dimensions.width = clampDimension(dimensions.height * ratio);
            }
            return dimensions;
        };

        const update = source => {
            if (syncing) {
                return;
            }
            syncing = true;
            const dpi = Math.max(0.01, Number(resolution.input.value) || 96);
            const dimensions = maintainRatio(source, width.input, height.input, {
                width: clampDimension(width.input.value),
                height: clampDimension(height.input.value)
            });
            applyDimensions(dimensions.width, dimensions.height, dpi);
            syncing = false;
        };

        const updateFromPrint = source => {
            if (syncing) {
                return;
            }
            syncing = true;
            const dpi = Math.max(0.01, Number(resolution.input.value) || 96);
            const dimensions = maintainRatio(source, printWidth.input, printHeight.input, {
                width: clampDimension(Number(printWidth.input.value) * dpi),
                height: clampDimension(Number(printHeight.input.value) * dpi)
            });
            applyDimensions(dimensions.width, dimensions.height, dpi);
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

        return {update, clampDimension};
    }

    static createTitleBar() {
        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar";
        let close = null;
        {
            // Title
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            {
                const icon = document.createElement("img");
                icon.src = "assets/icons/menu_file_new_icon.png";
                icon.alt = "";

                const title = document.createElement("strong");
                title.textContent = "New";
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
        footer.className = "app-dialog-footer new-file-footer";
        let cancel = null;
        {
            const spacer = document.createElement("span");

            // Dialog buttons
            const buttons = document.createElement("div");
            {
                const ok = document.createElement("button");
                ok.type = "submit";
                ok.textContent = "OK";

                cancel = document.createElement("button");
                cancel.type = "button";
                cancel.textContent = "Cancel";
                buttons.append(ok, cancel);
            }
            footer.append(spacer, buttons);
        }
        return {element: footer, cancel};
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
            body.className = "new-file-section-body";
            element.append(legend, body);
        }
        return {element, body};
    }

    static numberRow(labelText, value, unit, step = 1) {
        const row = document.createElement("label");
        row.className = "new-file-row";
        let input = null;
        {
            // Label
            const label = document.createElement("span");
            label.textContent = labelText;

            // Value
            input = document.createElement("input");
            input.type = "number";
            input.min = step;
            input.max = 32768;
            input.step = step;
            input.value = value;

            // Unit
            const suffix = document.createElement("span");
            suffix.textContent = unit;
            row.append(label, NumberInput.wrap(input), suffix);
        }
        return {row, input};
    }
}

NewFileDialog.activePromise = null;
