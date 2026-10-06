class LayerPropertiesDialog {

    static open(properties, onPreview = null) {
        return new Promise(resolve => {
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop";
            if (isApp) backdrop.classList.add("dialog-backdrop-app");

            const dialog = document.createElement("form");
            dialog.className = "app-dialog layer-properties-dialog";
            const titleBar = document.createElement("header");
            titleBar.className = "app-dialog-title-bar";
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            const icon = document.createElement("img");
            icon.src = "assets/icons/menu_layers_layer_properties_icon.png";
            icon.alt = "";
            const title = document.createElement("strong");
            title.textContent = i18n("menu.layers.layerProperties.text").replace(/\.\.\.$/, "");
            titleGroup.append(icon, title);
            const close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            titleBar.append(titleGroup, close);

            const content = document.createElement("div");
            content.className = "layer-properties-content";

            const nameRow = this.row("Name:", "layer-properties-name");
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.value = properties.name || "";
            nameRow.appendChild(nameInput);

            const opacityRow = this.row("Opacity:", "layer-properties-opacity");
            const opacityControls = document.createElement("div");
            opacityControls.className = "layer-properties-opacity-controls";
            const opacityInput = document.createElement("input");
            opacityInput.type = "range";
            opacityInput.min = "0";
            opacityInput.max = "255";
            opacityInput.value = String(properties.opacity);
            const opacityValue = document.createElement("input");
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
            opacityControls.append(opacityInput, opacityValue);
            opacityRow.appendChild(opacityControls);
            setOpacity(properties.opacity);

            const blendRow = this.row("Blend Mode:", "layer-properties-blend");
            const blendInput = document.createElement("select");
            for (const blendMode of LayerProperties.BLEND_MODES) {
                const option = document.createElement("option");
                option.value = blendMode.value;
                option.textContent = blendMode.label;
                blendInput.appendChild(option);
            }
            blendInput.value = LayerProperties.getBlendMode(properties.blendMode).value;
            blendRow.appendChild(blendInput);

            const visibleRow = document.createElement("label");
            visibleRow.className = "layer-properties-visible";
            const visibleInput = document.createElement("input");
            visibleInput.type = "checkbox";
            visibleInput.checked = properties.visible;
            const visibleText = document.createElement("span");
            visibleText.textContent = "Visible";
            visibleRow.append(visibleInput, visibleText);

            content.append(nameRow, opacityRow, blendRow, visibleRow);

            const readProperties = () => new LayerProperties(
                nameInput.value,
                visibleInput.checked,
                properties.isBackground,
                Math.max(0, Math.min(255, Math.round(Number(opacityInput.value)))),
                blendInput.value
            );
            const preview = () => {
                if (onPreview !== null) onPreview(readProperties());
            };
            nameInput.addEventListener("input", preview);
            opacityInput.addEventListener("input", preview);
            opacityValue.addEventListener("input", preview);
            blendInput.addEventListener("change", preview);
            visibleInput.addEventListener("change", preview);

            const footer = document.createElement("footer");
            footer.className = "app-dialog-footer";
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
            let closed = false;
            const finish = value => {
                if (closed) return;
                closed = true;
                document.removeEventListener("keydown", onKeyDown, true);
                if (mover !== null) mover.destroy();
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
                if (event.target === backdrop) finish(null);
            };
            dialog.onsubmit = event => {
                event.preventDefault();
                const result = readProperties();
                result.name = result.name.trim() || properties.name;
                finish(result);
            };

            dialog.append(titleBar, content, footer);
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
        const label = document.createElement("span");
        label.textContent = labelText;
        row.appendChild(label);
        return row;
    }
}
