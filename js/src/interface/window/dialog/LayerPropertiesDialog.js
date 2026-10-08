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

class LayerPropertiesDialog {

    static open(properties, onPreview = null) {
        return new Promise(resolve => {
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop";
            if (isApp) {
                backdrop.classList.add("dialog-backdrop-app");
            }

            const dialog = document.createElement("form");
            dialog.className = "app-dialog layer-properties-dialog";
            let titleBar = null;
            let close = null;
            let nameInput = null;
            let opacityInput = null;
            let opacityValue = null;
            let blendInput = null;
            let visibleInput = null;
            let cancel = null;
            {
                // Title bar
                titleBar = document.createElement("header");
                titleBar.className = "app-dialog-title-bar";
                {
                    const titleGroup = document.createElement("div");
                    titleGroup.className = "app-dialog-title";
                    {
                        const icon = document.createElement("img");
                        icon.src = "assets/icons/menu_layers_layer_properties_icon.png";
                        icon.alt = "";

                        const title = document.createElement("strong");
                        title.textContent = i18n("menu.layers.layerProperties.text").replace(/\.\.\.$/, "");

                        titleGroup.append(icon, title);
                    }

                    close = document.createElement("button");
                    close.type = "button";
                    close.className = "app-dialog-close";
                    close.textContent = "×";
                    titleBar.append(titleGroup, close);
                }

                // Content
                const content = document.createElement("div");
                content.className = "layer-properties-content";
                {
                    // Name
                    const nameRow = this.row("Name:", "layer-properties-name");
                    nameInput = document.createElement("input");
                    nameInput.type = "text";
                    nameInput.value = properties.name || "";
                    nameRow.appendChild(nameInput);

                    // Opacity
                    const opacityRow = this.row("Opacity:", "layer-properties-opacity");
                    {
                        const opacityControls = document.createElement("div");
                        opacityControls.className = "layer-properties-opacity-controls";

                        opacityInput = document.createElement("input");
                        opacityInput.type = "range";
                        opacityInput.min = "0";
                        opacityInput.max = "255";
                        opacityInput.value = String(properties.opacity);

                        opacityValue = document.createElement("input");
                        opacityValue.className = "layer-properties-opacity-value";
                        opacityValue.type = "number";
                        opacityValue.min = "0";
                        opacityValue.max = "255";
                        opacityValue.value = opacityInput.value;

                        const setOpacity = value => {
                            const opacity = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
                            opacityInput.value = String(opacity);
                            opacityValue.value = String(opacity);
                            opacityInput.style.setProperty("--layer-opacity", opacity / 255 * 100 + "%");
                        };
                        opacityInput.oninput = () => setOpacity(opacityInput.value);
                        opacityValue.oninput = () => setOpacity(opacityValue.value);
                        opacityControls.append(opacityInput, NumberInput.wrap(opacityValue));
                        opacityRow.appendChild(opacityControls);
                        setOpacity(properties.opacity);
                    }

                    // Blend mode
                    const blendRow = this.row("Blend Mode:", "layer-properties-blend");
                    blendInput = document.createElement("select");
                    for (const blendMode of LayerProperties.BLEND_MODES) {
                        const option = document.createElement("option");
                        option.value = blendMode.value;
                        option.textContent = blendMode.label;
                        blendInput.appendChild(option);
                    }
                    blendInput.value = LayerProperties.getBlendMode(properties.blendMode).value;
                    blendRow.appendChild(blendInput);

                    // Visibility
                    const visibleRow = document.createElement("label");
                    visibleRow.className = "layer-properties-visible";
                    {
                        visibleInput = document.createElement("input");
                        visibleInput.type = "checkbox";
                        visibleInput.checked = properties.visible;

                        const visibleText = document.createElement("span");
                        visibleText.textContent = "Visible";
                        visibleRow.append(visibleInput, visibleText);
                    }

                    content.append(nameRow, opacityRow, blendRow, visibleRow);
                }

                // Footer
                const footer = document.createElement("footer");
                footer.className = "app-dialog-footer";
                {
                    const spacer = document.createElement("span");

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

                dialog.append(titleBar, content, footer);
            }

            const readProperties = () => new LayerProperties(
                nameInput.value,
                visibleInput.checked,
                properties.isBackground,
                Math.max(0, Math.min(255, Math.round(Number(opacityInput.value)))),
                blendInput.value
            );
            const preview = () => {
                if (onPreview !== null) {
                    onPreview(readProperties());
                }
            };
            nameInput.addEventListener("input", preview);
            opacityInput.addEventListener("input", preview);
            opacityValue.addEventListener("input", preview);
            blendInput.addEventListener("change", preview);
            visibleInput.addEventListener("change", preview);

            let mover = null;
            let closed = false;
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
            const onKeyDown = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(null);
                }
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
                const result = readProperties();
                result.name = result.name.trim() || properties.name;
                finish(result);
            };

            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            nameInput.select();
        });
    }

    static row(labelText, className = "") {
        const row = document.createElement("label");
        row.className = "layer-properties-row " + className;
        {
            const label = document.createElement("span");
            label.textContent = labelText;
            row.appendChild(label);
        }
        return row;
    }
}
