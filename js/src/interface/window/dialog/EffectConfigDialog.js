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

class EffectConfigDialog {

    static themeColor(property, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
        return value || fallback;
    }

    static open(options) {
        return new Promise(resolve => {
            const values = {...options.values};
            const backdrop = document.createElement("div");
            backdrop.className = "app-dialog-backdrop";
            if (isApp) {
                backdrop.classList.add("dialog-backdrop-app");
            }

            const dialog = document.createElement("form");
            dialog.className = "app-dialog effect-config-dialog";
            if (options.layout) {
                dialog.classList.add("effect-" + options.layout + "-dialog");
            }
            const {element: titleBar, close} = this.createTitleBar(options);

            const content = document.createElement("div");
            content.className = "effect-config-content";
            const setters = new Map();
            let previewEnabled = true;
            let previewFrame = null;
            let previewTimer = null;
            let previewDelay = 0;
            let previewGeneration = 0;
            const cancelScheduledPreview = () => {
                ++previewGeneration;
                if (previewFrame !== null) {
                    cancelAnimationFrame(previewFrame);
                }
                if (previewTimer !== null) {
                    clearTimeout(previewTimer);
                }
                previewFrame = null;
                previewTimer = null;
                backdrop.classList.remove("effect-preview-rendering");
                dialog.removeAttribute("aria-busy");
            };
            const notify = (immediate = false) => {
                cancelScheduledPreview();
                const generation = previewGeneration;
                previewFrame = requestAnimationFrame(() => {
                    if (generation !== previewGeneration) {
                        return;
                    }
                    previewFrame = null;
                    backdrop.classList.add("effect-preview-rendering");
                    dialog.setAttribute("aria-busy", "true");
                    // Run after the frame is painted so opening or manipulating
                    // a dialog never waits behind a long synchronous effect.
                    previewTimer = setTimeout(() => {
                        if (generation !== previewGeneration) {
                            return;
                        }
                        previewTimer = null;
                        const start = performance.now();
                        const complete = () => {
                            if (generation !== previewGeneration) {
                                return;
                            }
                            const elapsed = performance.now() - start;
                            // Slow effects get a longer coalescing window. This
                            // prevents stale slider positions from forming a render
                            // queue while lightweight effects continue to feel live.
                            previewDelay = Math.min(250, Math.max(16, elapsed / 2));
                            backdrop.classList.remove("effect-preview-rendering");
                            dialog.removeAttribute("aria-busy");
                        };
                        try {
                            const result = options.onPreview(previewEnabled ? {...values} : null);
                            if (result !== null && typeof result === "object"
                                && typeof result.then === "function") {
                                result.then(complete, error => {
                                    console.error("Effect preview failed", error);
                                    complete();
                                });
                            } else {
                                complete();
                            }
                        } catch (error) {
                            console.error("Effect preview failed", error);
                            complete();
                        }
                    }, immediate ? 0 : previewDelay);
                });
            };

            const specialized = options.layout
                ? EffectConfigDialog.createSpecializedContent(options, values, notify)
                : null;
            if (specialized !== null) {
                content.appendChild(specialized.element);
                for (const [key, setter] of specialized.setters) {
                    setters.set(key, setter);
                }
            } else {
                for (const control of options.controls) {
                    const item = this.createGenericControl(control, values, notify);
                    content.appendChild(item.element);
                    setters.set(control.key, item.setValue);
                }
            }

            const {element: footer, cancel} = this.createFooter(specialized, enabled => {
                previewEnabled = enabled;
                notify(true);
            });

            let mover = null;
            let closed = false;
            const finish = result => {
                if (closed) {
                    return;
                }
                closed = true;
                cancelScheduledPreview();
                document.removeEventListener("keydown", onKeyDown, true);
                if (mover !== null) {
                    mover.destroy();
                }
                backdrop.remove();
                resolve(result);
            };
            const onKeyDown = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(null);
                }
            };
            close.onclick = cancel.onclick = () => finish(null);
            backdrop.onclick = event => {
                if (event.target === backdrop) {
                    finish(null);
                }
            };
            dialog.onsubmit = event => {
                event.preventDefault();
                finish({...values});
            };
            dialog.append(titleBar, content, footer);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);
            mover = new DialogMover(dialog, titleBar, backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            notify(true);
        });
    }

    static createGenericControl(control, values, notify) {
        if (control.type === "curve") {
            return this.createCurveEditor(control, values, notify);
        }

        if (control.type === "select") {
            const row = document.createElement("section");
            row.className = "effect-config-row effect-config-select-row";
            let setValue = null;
            {
                // Label
                const label = document.createElement("label");
                label.textContent = control.label;

                // Choices
                const select = document.createElement("select");
                for (const choice of control.choices) {
                    const option = document.createElement("option");
                    option.value = choice.value;
                    option.textContent = choice.label;
                    select.appendChild(option);
                }
                setValue = value => select.value = value;
                setValue(values[control.key]);
                select.onchange = () => {
                    values[control.key] = select.value;
                    notify(true);
                };
                row.append(label, select);
            }
            return {element: row, setValue};
        }

        if (control.type === "checkbox") {
            const label = document.createElement("label");
            label.className = "effect-config-checkbox";
            let setValue = null;
            {
                const input = document.createElement("input");
                input.type = "checkbox";
                setValue = value => input.checked = value;
                setValue(values[control.key]);
                input.onchange = () => {
                    values[control.key] = input.checked;
                    notify(true);
                };
                label.append(input, document.createTextNode(control.label));
            }
            return {element: label, setValue};
        }

        const row = document.createElement("section");
        row.className = "effect-config-row";
        let setValue = null;
        {
            // Label
            const label = document.createElement("label");
            label.textContent = control.label;

            // Slider and number input
            const controls = document.createElement("div");
            {
                const range = document.createElement("input");
                range.type = "range";
                range.min = control.min;
                range.max = control.max;
                range.step = control.step;

                const number = document.createElement("input");
                number.type = "number";
                number.min = control.min;
                number.max = control.max;
                number.step = control.step;

                setValue = value => {
                    const numeric = Math.max(control.min, Math.min(control.max, Number(value)));
                    values[control.key] = numeric;
                    range.value = numeric;
                    number.value = numeric;
                    const percent = (numeric - control.min) / (control.max - control.min) * 100;
                    range.style.setProperty("--effect-value", percent + "%");
                };
                setValue(values[control.key]);
                range.oninput = () => {
                    setValue(range.value);
                    notify();
                };
                range.onchange = () => notify(true);
                number.oninput = () => {
                    setValue(number.value);
                    notify();
                };
                number.onchange = () => notify(true);
                const resetValue = () => {
                    setValue(control.defaultValue);
                    notify(true);
                };
                this.enableSliderThumbReset(range, resetValue);
                controls.append(range, NumberInput.wrap(number), this.createResetButton(resetValue));
            }
            row.append(label, controls);
        }
        return {element: row, setValue};
    }

    static createTitleBar(options) {
        const titleBar = document.createElement("header");
        titleBar.className = "app-dialog-title-bar";
        let close = null;
        {
            // Title
            const titleGroup = document.createElement("div");
            titleGroup.className = "app-dialog-title";
            {
                const icon = document.createElement("img");
                icon.src = options.icon;
                icon.alt = "";

                const title = document.createElement("strong");
                title.textContent = options.title;
                titleGroup.append(icon, title);
            }

            // Close button
            close = document.createElement("button");
            close.type = "button";
            close.className = "app-dialog-close";
            close.textContent = "×";
            titleBar.append(titleGroup, close);
        }
        return {element: titleBar, close};
    }

    static createFooter(specialized, onPreviewChange) {
        const footer = document.createElement("footer");
        footer.className = "app-dialog-footer effect-config-footer";
        let cancel = null;
        {
            // Preview and specialized actions
            const left = document.createElement("div");
            {
                if (specialized === null) {
                    const preview = document.createElement("label");
                    preview.className = "effect-config-checkbox";
                    {
                        const input = document.createElement("input");
                        input.type = "checkbox";
                        input.checked = true;
                        input.onchange = () => onPreviewChange(input.checked);
                        preview.append(input, document.createTextNode("Preview"));
                    }
                    left.appendChild(preview);
                } else if (specialized.leftButtons) {
                    for (const button of specialized.leftButtons) {
                        left.prepend(button);
                    }
                }
            }

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

            footer.append(left, buttons);
        }
        return {element: footer, cancel};
    }

    static createSpecializedContent(options, values, notify) {
        switch (options.layout) {
            case "hueSaturation": return this.createHueSaturationContent(options, values, notify);
            case "rotateZoom": return this.createRotateZoomContent(options, values, notify);
            case "curves": return this.createCurvesContent(options, values, notify);
            case "levels": return this.createLevelsContent(options, values, notify);
            default: return null;
        }
    }

    static findControl(options, key) {
        return options.controls.find(control => control.key === key);
    }

    static createResetButton(onReset) {
        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "effect-row-reset";
        reset.title = "Reset";
        reset.setAttribute("aria-label", "Reset");
        {
            const icon = document.createElement("img");
            icon.src = "assets/icons/reset_icon.png";
            icon.alt = "";
            reset.appendChild(icon);
        }
        reset.onclick = onReset;
        return reset;
    }

    static enableSliderThumbReset(range, onReset, thumbWidth = 14) {
        const lastThumbPointerDown = new Map();
        range.addEventListener("pointerdown", event => {
            if ((event.button !== MouseButton.LEFT && event.button !== MouseButton.RIGHT)
                || !EffectConfigDialog.isPointerOverSliderThumb(range, event, thumbWidth)) {
                lastThumbPointerDown.delete(event.button);
                return;
            }

            const now = performance.now();
            const previous = lastThumbPointerDown.get(event.button) || 0;
            if (now - previous <= 500) {
                event.preventDefault();
                lastThumbPointerDown.delete(event.button);
                onReset();
            } else {
                lastThumbPointerDown.set(event.button, now);
            }
        });
        range.addEventListener("pointercancel", () => lastThumbPointerDown.clear());
        range.addEventListener("contextmenu", event => {
            if (EffectConfigDialog.isPointerOverSliderThumb(range, event, thumbWidth)) {
                event.preventDefault();
            }
        });
    }

    static isPointerOverSliderThumb(range, event, thumbWidth) {
        const bounds = range.getBoundingClientRect();
        const min = Number(range.min) || 0;
        const max = Number(range.max) || 100;
        const value = Number(range.value);
        const ratio = max === min ? 0 : (value - min) / (max - min);
        const center = bounds.left + thumbWidth / 2
            + Utility.clamp(ratio, 0, 1) * Math.max(0, bounds.width - thumbWidth);
        return Math.abs(event.clientX - center) <= thumbWidth / 2 + 2;
    }

    static createSpecializedSlider(control, values, notify, options = {}) {
        const row = document.createElement("div");
        row.className = "effect-special-slider " + (options.className || "");
        let range = null;
        let number = null;
        let line = null;
        {
            // Label
            if (options.showLabel !== false) {
                const label = document.createElement("label");
                label.textContent = control.label;
                row.appendChild(label);
            }

            // Slider and value
            line = document.createElement("div");
            line.className = "effect-special-slider-line";
            {
                range = document.createElement("input");
                range.type = "range";
                range.min = control.exponential ? 0 : control.min;
                range.max = control.exponential ? 1000 : control.max;
                range.step = control.exponential ? 1 : control.step;

                number = document.createElement("input");
                number.type = "number";
                number.min = control.min;
                number.max = control.max;
                number.step = control.step;
                line.append(range, NumberInput.wrap(number));
            }
            row.appendChild(line);
        }
        const set = value => {
            const numeric = Math.max(control.min, Math.min(control.max, Number(value)));
            values[control.key] = numeric;
            range.value = control.exponential
                ? Math.log(numeric / control.min) / Math.log(control.max / control.min) * 1000
                : numeric;
            number.value = numeric.toFixed(control.step < 1 ? 2 : 0);
            range.style.setProperty("--effect-value", ((numeric - control.min) / (control.max - control.min) * 100) + "%");
            if (options.onSet) {
                options.onSet(numeric);
            }
        };
        range.oninput = () => {
            const value = control.exponential
                ? control.min * Math.pow(control.max / control.min, Number(range.value) / 1000)
                : range.value;
            set(value);
            notify();
        };
        range.onchange = () => notify(true);
        number.oninput = () => { set(number.value); notify(); };
        number.onchange = () => notify(true);
        const resetValue = () => { set(control.defaultValue); notify(true); };
        this.enableSliderThumbReset(range, resetValue);
        if (options.reset !== false) {
            line.appendChild(this.createResetButton(resetValue));
        }
        set(values[control.key]);
        return {element: row, setValue: set};
    }

    static createSpecializedSelect(control, values, notify, labelText = control.label) {
        const row = document.createElement("label");
        row.className = "effect-special-select";
        let select = null;
        {
            // Label
            row.appendChild(document.createTextNode(labelText));

            // Choices
            select = document.createElement("select");
            for (const choice of control.choices) {
                const option = document.createElement("option");
                option.value = choice.value;
                option.textContent = choice.label;
                select.appendChild(option);
            }
            row.appendChild(select);
        }
        const set = value => {
            values[control.key] = value;
            select.value = value;
        };
        select.onchange = () => { set(select.value); notify(true); };
        set(values[control.key]);
        return {element: row, setValue: set};
    }

    static createHueSaturationContent(options, values, notify) {
        const element = document.createElement("div");
        element.className = "effect-specialized-content hue-saturation-content";
        const setters = new Map();
        for (const key of ["hue", "saturation", "lightness"]) {
            const slider = this.createSpecializedSlider(this.findControl(options, key), values, notify, {
                className: "hue-saturation-" + key
            });
            element.appendChild(slider.element);
            setters.set(key, slider.setValue);
        }
        return {element, setters, showReset: false};
    }

    static createRotateZoomContent(options, values, notify) {
        const element = document.createElement("div");
        element.className = "effect-specialized-content rotate-zoom-content";
        const setters = new Map();
        const createGroup = (title, createVisual, keys) => {
            const section = document.createElement("section");
            {
                // Heading
                const heading = document.createElement("h3");
                heading.textContent = title;

                // Controls
                const body = document.createElement("div");
                body.className = "rotate-zoom-group-body";
                {
                    const groupSetters = new Map();
                    const visual = createVisual(changes => {
                        for (const [key, value] of Object.entries(changes)) {
                            groupSetters.get(key)(value);
                        }
                        notify();
                    });
                    body.appendChild(visual.element);

                    const sliders = document.createElement("div");
                    sliders.className = "rotate-zoom-sliders";
                    for (const key of keys) {
                        const slider = this.createSpecializedSlider(this.findControl(options, key), values, notify, {
                            showLabel: false,
                            onSet: () => visual.redraw()
                        });
                        sliders.appendChild(slider.element);
                        setters.set(key, slider.setValue);
                        groupSetters.set(key, slider.setValue);
                    }
                    visual.redraw();
                    body.appendChild(sliders);
                }
                section.append(heading, body);
            }
            return section;
        };
        {
            // Rotation and pan
            element.appendChild(createGroup(
                "Roll / Rotate",
                onChange => this.createRollVisual(values, onChange),
                ["angle", "rollDirection", "rollAmount"]
            ));
            element.appendChild(createGroup(
                "Pan",
                onChange => this.createPanVisual(options.source, values, onChange),
                ["panX", "panY"]
            ));

            // Zoom and quality
            for (const key of ["zoom", "quality"]) {
                const slider = this.createSpecializedSlider(
                    this.findControl(options, key),
                    values,
                    notify,
                    {reset: true}
                );
                element.appendChild(slider.element);
                setters.set(key, slider.setValue);
            }

            // Sampling
            const tiling = this.createSpecializedSelect(
                this.findControl(options, "tiling"), values, notify, "Tiling Mode:"
            );
            const sampling = this.createSpecializedSelect(
                this.findControl(options, "sampling"), values, notify, "Sampling:"
            );
            element.append(tiling.element, sampling.element);
            setters.set("tiling", tiling.setValue);
            setters.set("sampling", sampling.setValue);
        }
        return {element, setters, showReset: false};
    }

    static createRollVisual(values, onChange) {
        const canvas = document.createElement("canvas");
        canvas.className = "rotate-roll-visual";
        canvas.width = 98;
        canvas.height = 98;
        const context = canvas.getContext("2d");
        const center = 49;
        const outerRadius = 46;
        const sphereRadius = 31;
        let drag = null;

        // Paint.NET stores this control as angle, roll direction, and roll amount.
        const projectSpherePoint = (x, y, z, rollX, rollY) => {
            const rollLength = Math.hypot(rollX, rollY);
            if (rollLength === 0) {
                return {x, y, z};
            }

            const axisAngle = Math.atan2(rollY, rollX);
            const sinAxis = Math.sin(axisAngle);
            const cosAxis = Math.cos(axisAngle);
            const cosRoll = Math.sqrt(Math.max(0, 1 - rollLength * rollLength));

            let nextX = cosAxis * x - sinAxis * y;
            let nextY = sinAxis * x + cosAxis * y;
            const nextZ = rollLength * nextX + cosRoll * z;
            nextX = cosRoll * nextX - rollLength * z;

            return {
                x: cosAxis * nextX + sinAxis * nextY,
                y: -sinAxis * nextX + cosAxis * nextY,
                z: nextZ
            };
        };
        const spherePoint = (longitude, latitude, rollX, rollY) => projectSpherePoint(
            Math.cos(longitude) * Math.cos(latitude),
            Math.sin(longitude) * Math.cos(latitude),
            Math.sin(latitude),
            rollX,
            rollY
        );
        const drawSphereSegment = (start, end, color, width) => {
            // Paint.NET only draws segments on the visible hemisphere.
            if (start.z >= .03 || end.z >= .03) {
                return;
            }
            context.strokeStyle = color;
            context.lineWidth = width;
            context.beginPath();
            context.moveTo(start.x * sphereRadius, start.y * sphereRadius);
            context.lineTo(end.x * sphereRadius, end.y * sphereRadius);
            context.stroke();
        };
        const redraw = () => {
            const lightTheme = document.documentElement.dataset.colorScheme === "light";
            const gridColor = this.themeColor("--color-curve-grid", "#888");
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.strokeStyle = gridColor;
            context.lineWidth = 1.4;
            context.beginPath();
            context.arc(center, center, outerRadius, 0, Math.PI * 2);
            context.stroke();
            context.save();
            context.beginPath();
            context.arc(center, center, sphereRadius, 0, Math.PI * 2);
            context.clip();
            context.translate(center, center);
            const gridAngle = values.angle * Math.PI / 180;
            const direction = values.rollDirection * Math.PI / 180;
            const rollX = values.rollAmount * Math.cos(direction) / 90;
            const rollY = -values.rollAmount * Math.sin(direction) / 90;

            // Latitude rings. Their shade follows v5's near-to-far gradient.
            for (let latitudeIndex = 0; latitudeIndex >= -12; --latitudeIndex) {
                const latitude = latitudeIndex * Math.PI / 24;
                const shade = lightTheme
                    ? Math.round(55 + (latitudeIndex + 12) / 12 * 90)
                    : Math.round(100 + (latitudeIndex + 12) / 12 * 100);
                const color = `rgb(${shade}, ${shade}, ${shade})`;
                let previous = spherePoint(-gridAngle - Math.PI, latitude, rollX, rollY);
                for (let index = -144; index <= 144; ++index) {
                    const longitude = -gridAngle + index * Math.PI / 144;
                    const current = spherePoint(longitude, latitude, rollX, rollY);
                    drawSphereSegment(previous, current, color, 1);
                    previous = current;
                }
            }

            // Longitude arcs make the sphere's tilt and depth unambiguous.
            for (let longitudeIndex = -4; longitudeIndex < 4; ++longitudeIndex) {
                const longitude = -gridAngle + longitudeIndex * Math.PI / 4;
                let previous = spherePoint(longitude, -Math.PI / 2, rollX, rollY);
                for (let latitudeIndex = -16; latitudeIndex <= 0; ++latitudeIndex) {
                    const latitude = latitudeIndex * Math.PI / 32;
                    const current = spherePoint(longitude, latitude, rollX, rollY);
                    drawSphereSegment(
                        previous,
                        current,
                        lightTheme ? "rgba(35,35,35,.72)" : "rgba(225,225,225,.72)",
                        1
                    );
                    previous = current;
                }
            }
            context.restore();
            context.strokeStyle = gridColor;
            context.beginPath();
            context.arc(center, center, sphereRadius, 0, Math.PI * 2);
            context.stroke();
            const angle = -values.angle * Math.PI / 180;
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(center + Math.cos(angle) * sphereRadius, center + Math.sin(angle) * sphereRadius);
            context.lineTo(center + Math.cos(angle) * outerRadius, center + Math.sin(angle) * outerRadius);
            context.stroke();
        };
        const point = event => {
            const bounds = canvas.getBoundingClientRect();
            return {
                x: (event.clientX - bounds.left) * canvas.width / bounds.width,
                y: (event.clientY - bounds.top) * canvas.height / bounds.height
            };
        };
        const update = event => {
            if (!drag) {
                return;
            }
            const current = point(event);
            if (drag.sphere) {
                let x = drag.startX + (current.x - drag.x) * 3 / (outerRadius * 2 - 4);
                let y = drag.startY + (current.y - drag.y) * 3 / (outerRadius * 2 - 4);
                const length = Math.hypot(x, y);
                if (length > 1) { x /= length; y /= length; }
                if (event.shiftKey) {
                    Math.abs(x) > Math.abs(y) ? y = 0 : x = 0;
                }
                onChange({
                    rollDirection: Math.atan2(y, x) * 180 / Math.PI,
                    rollAmount: 89.94 * Math.hypot(x, y)
                });
            } else {
                let angle = Math.atan2(-(current.y - center), current.x - center) * 180 / Math.PI;
                if (event.shiftKey) {
                    angle = Math.round(angle / 15) * 15;
                }
                onChange({angle});
            }
        };
        canvas.onpointerdown = event => {
            if (event.button !== 0) {
                return;
            }
            const current = point(event);
            const amount = values.rollAmount / 89.9;
            const direction = values.rollDirection * Math.PI / 180;
            drag = {
                x: current.x,
                y: current.y,
                sphere: Math.hypot(current.x - center, current.y - center) <= sphereRadius,
                startX: amount * Math.cos(direction),
                startY: amount * Math.sin(direction)
            };
            canvas.setPointerCapture(event.pointerId);
            update(event);
        };
        canvas.onpointermove = update;
        canvas.onpointerup = canvas.onpointercancel = event => {
            if (!drag) {
                return;
            }
            update(event);
            drag = null;
            if (canvas.hasPointerCapture(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
        };
        canvas.ondblclick = () => onChange({angle: 0, rollDirection: 0, rollAmount: 0});
        return {element: canvas, redraw};
    }

    static createPanVisual(source, values, onChange) {
        const canvas = document.createElement("canvas");
        canvas.className = "rotate-pan-visual";
        canvas.width = 100;
        canvas.height = 76;
        const context = canvas.getContext("2d");
        let sourceCanvas = null;
        if (source) {
            sourceCanvas = document.createElement("canvas");
            sourceCanvas.width = source.width;
            sourceCanvas.height = source.height;
            sourceCanvas.getContext("2d").putImageData(source, 0, 0);
        }
        const fit = sourceCanvas
            ? Math.min(90 / sourceCanvas.width, 66 / sourceCanvas.height)
            : 1;
        const dragWidth = sourceCanvas ? sourceCanvas.width * fit : 90;
        const dragHeight = sourceCanvas ? sourceCanvas.height * fit : 66;
        const redraw = () => {
            context.fillStyle = "white";
            context.fillRect(0, 0, canvas.width, canvas.height);
            if (sourceCanvas) {
                context.globalAlpha = .45;
                context.drawImage(sourceCanvas, (canvas.width - dragWidth) / 2, (canvas.height - dragHeight) / 2, dragWidth, dragHeight);
                context.globalAlpha = 1;
            }
            const rawX = canvas.width / 2 + values.panX * dragWidth / 2;
            const rawY = canvas.height / 2 + values.panY * dragHeight / 2;
            const dx = rawX - canvas.width / 2;
            const dy = rawY - canvas.height / 2;
            const edgeScale = Math.min(
                1,
                dx === 0 ? Infinity : (canvas.width / 2 - 2) / Math.abs(dx),
                dy === 0 ? Infinity : (canvas.height / 2 - 2) / Math.abs(dy)
            );
            const x = canvas.width / 2 + dx * edgeScale;
            const y = canvas.height / 2 + dy * edgeScale;
            context.strokeStyle = "#777";
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(canvas.width / 2, canvas.height / 2);
            context.lineTo(x, y);
            context.stroke();
            context.strokeStyle = "white";
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(rawX - 6, rawY); context.lineTo(rawX + 6, rawY);
            context.moveTo(rawX, rawY - 6); context.lineTo(rawX, rawY + 6);
            context.stroke();
            context.strokeStyle = "#111";
            context.lineWidth = 2;
            context.stroke();
        };
        const update = event => {
            const bounds = canvas.getBoundingClientRect();
            const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
            const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
            onChange({
                panX: Math.max(-10, Math.min(10, (x - canvas.width / 2) / (dragWidth / 2))),
                panY: Math.max(-10, Math.min(10, (y - canvas.height / 2) / (dragHeight / 2)))
            });
        };
        canvas.onpointerdown = event => {
            if (event.button !== 0) {
                return;
            }
            canvas.setPointerCapture(event.pointerId);
            update(event);
        };
        canvas.onpointermove = event => {
            if (canvas.hasPointerCapture(event.pointerId)) {
                update(event);
            }
        };
        canvas.onpointerup = canvas.onpointercancel = event => {
            if (!canvas.hasPointerCapture(event.pointerId)) {
                return;
            }
            update(event);
            canvas.releasePointerCapture(event.pointerId);
        };
        return {element: canvas, redraw};
    }

    static createCurvesContent(options, values, notify) {
        let element = document.createElement("div");
        element.className = "effect-specialized-content curves-content";
        let setters = new Map();
        let identity = [[0, 0], [255, 255]];
        for (const key of ["points", "redPoints", "greenPoints", "bluePoints"]) {
            if (!Array.isArray(values[key])) {
                values[key] = identity.map(point => [...point]);
            }
        }

        let coordinates = null;
        let channelOptions = null;
        let select = null;
        let editor = new CurveEditor(values, notify, point => {
            coordinates.textContent = point === null ? "" : "(" + point[0] + ", " + point[1] + ")";
        });
        {
            // Transfer map and coordinates
            let transfer = document.createElement("div");
            transfer.className = "curves-transfer-row";
            {
                let channel = document.createElement("label");
                channel.className = "curves-transfer-select";
                {
                    channel.appendChild(document.createTextNode("Transfer Map"));

                    select = document.createElement("select");
                    for (const choice of this.findControl(options, "channel").choices) {
                        let option = document.createElement("option");
                        option.value = choice.value;
                        option.textContent = choice.label;
                        select.appendChild(option);
                    }
                    channel.appendChild(select);
                }

                coordinates = document.createElement("output");
                coordinates.className = "curves-coordinates";
                transfer.append(channel, coordinates);
            }
            element.appendChild(transfer);

            // Curve
            element.appendChild(editor.buildElement());

            // Channels
            channelOptions = document.createElement("div");
            channelOptions.className = "curves-channel-options";
            element.appendChild(channelOptions);

            // Tip
            let tip = document.createElement("strong");
            tip.className = "curves-tip";
            tip.textContent = "Tip: Right-click to remove control points.";
            element.appendChild(tip);
        }

        let channelSets = {
            luminosity: [{key: "points", name: "Luminosity", color: "#f2f2f2"}],
            rgb: [
                {key: "redPoints", name: "Red", color: "#ff4b4b"},
                {key: "greenPoints", name: "Green", color: "#45d65a"},
                {key: "bluePoints", name: "Blue", color: "#4b83ff"}
            ]
        };
        let setMode = mode => {
            values.channel = mode;
            select.value = mode;
            let channels = channelSets[mode] || channelSets.luminosity;
            editor.setChannels(channels);

            channelOptions.replaceChildren();
            for (const channel of channels) {
                let label = document.createElement("label");
                label.className = channels.length === 1 ? "disabled" : "";
                {
                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = editor.isChannelSelected(channel.key);
                    checkbox.disabled = channels.length === 1;
                    checkbox.onchange = () => editor.setChannelSelected(channel.key, checkbox.checked);
                    label.append(checkbox, document.createTextNode(channel.name));
                }
                channelOptions.appendChild(label);
            }
        };
        select.onchange = () => {
            setMode(select.value);
            notify(true);
        };
        setMode(values.channel);

        setters.set("channel", setMode);
        for (const key of ["points", "redPoints", "greenPoints", "bluePoints"]) {
            setters.set(key, points => editor.setCurve(key, points));
        }

        let reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Reset";
        reset.onclick = () => editor.reset();
        return {element, setters, leftButtons: [reset]};
    }

    static createLevelsContent(options, values, notify) {
        const element = document.createElement("div");
        element.className = "effect-specialized-content levels-content";
        const setters = new Map();
        const inputHistogram = this.createLevelsHistogram(options.source, values, false);
        const outputHistogram = this.createLevelsHistogram(options.source, values, true);
        const redrawHistograms = () => {
            inputHistogram.redraw();
            outputHistogram.redraw();
        };
        const redrawOutputHistogram = () => outputHistogram.redraw();
        {
            // Histograms and value columns
            const input = this.createLevelsColumn(
                "Input", options, values, notify, setters, true, redrawOutputHistogram
            );
            const output = this.createLevelsColumn(
                "Output", options, values, notify, setters, false, redrawOutputHistogram
            );
            element.append(inputHistogram.element, input, output, outputHistogram.element);

            // Channels
            element.appendChild(this.createLevelsChannels(values, notify, setters, redrawHistograms));
        }

        // Automatic levels
        const auto = document.createElement("button");
        auto.type = "button";
        auto.textContent = "Auto";
        auto.onclick = () => {
            const extents = BitmapEffectEngine.channelExtents(options.source.data);
            const low = Math.min(...extents.min);
            const high = Math.max(...extents.max);
            setters.get("inputLow")(low);
            setters.get("inputHigh")(high);
            redrawHistograms();
            notify();
        };
        redrawHistograms();
        return {element, setters, leftButtons: [auto]};
    }

    static createLevelsChannels(values, notify, setters, redraw) {
        const channels = document.createElement("div");
        channels.className = "levels-channels";
        {
            for (const [key, channel] of [["red", "R"], ["green", "G"], ["blue", "B"]]) {
                const label = document.createElement("label");
                {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    const set = value => {
                        values[key] = !!value;
                        checkbox.checked = !!value;
                        redraw();
                    };
                    checkbox.onchange = () => {
                        set(checkbox.checked);
                        notify();
                    };
                    set(values[key]);
                    setters.set(key, set);
                    label.append(checkbox, document.createTextNode(channel));
                }
                channels.appendChild(label);
            }
        }
        return channels;
    }

    static createLevelsHistogram(source, values, output) {
        const wrapper = document.createElement("section");
        wrapper.className = "levels-histogram";
        let canvas = null;
        {
            // Heading
            const heading = document.createElement("h3");
            heading.textContent = output ? "Output Histogram" : "Input Histogram";

            // Histogram
            canvas = document.createElement("canvas");
            canvas.width = 178;
            canvas.height = 220;
            wrapper.append(heading, canvas);
        }
        const colors = [[255, 91, 105], [92, 224, 111], [105, 121, 255]];
        const channelKeys = ["red", "green", "blue"];
        const sourceBins = Array.from({length: 3}, () => new Uint32Array(256));
        if (source) {
            for (let offset = 0; offset < source.data.length; offset += 4) {
                for (let channel = 0; channel < 3; ++channel) {
                    sourceBins[channel][source.data[offset + channel]]++;
                }
            }
        }
        const mapValue = value => {
            const low = Math.min(values.inputLow, values.inputHigh - 1);
            const high = Math.max(values.inputHigh, low + 1);
            const outputLow = Math.min(values.outputLow, values.outputHigh - 1);
            const outputHigh = Math.max(values.outputHigh, outputLow + 1);
            const normalized = Math.max(0, Math.min(1, (value - low) / (high - low)));
            return outputLow + Math.pow(normalized, 1 / values.gamma) * (outputHigh - outputLow);
        };
        const redraw = () => {
            const bins = output
                ? Array.from({length: 3}, () => new Uint32Array(256))
                : sourceBins;
            if (output) {
                for (let channel = 0; channel < 3; ++channel) {
                    for (let original = 0; original < 256; ++original) {
                        const adjusted = values[channelKeys[channel]] ? mapValue(original) : original;
                        const destination = Math.max(0, Math.min(255, Math.round(adjusted)));
                        bins[channel][destination] += sourceBins[channel][original];
                    }
                }
            }
            let maximum = 1;
            for (const binsForChannel of bins) {
                for (let index = 0; index < 256; ++index) {
                    maximum = Math.max(maximum, binsForChannel[index]);
                }
            }
            const context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
            for (let channel = 0; channel < 3; ++channel) {
                const selected = values[channelKeys[channel]];
                const [red, green, blue] = colors[channel];
                const baseline = output ? 0 : canvas.width;
                const direction = output ? 1 : -1;
                context.beginPath();
                context.moveTo(baseline, canvas.height);
                for (let index = 0; index < 256; ++index) {
                    const previous = bins[channel][Math.max(0, index - 1)];
                    const current = bins[channel][index];
                    const next = bins[channel][Math.min(255, index + 1)];
                    const smoothed = (previous + current + next) / 3;
                    const x = baseline + direction * smoothed / maximum * canvas.width * .96;
                    const y = canvas.height - index / 255 * canvas.height;
                    context.lineTo(x, y);
                }
                context.lineTo(baseline, 0);
                context.closePath();
                context.fillStyle = `rgba(${red},${green},${blue},${selected ? .30 : .10})`;
                context.strokeStyle = `rgba(${red},${green},${blue},${selected ? .95 : .34})`;
                context.lineWidth = selected ? 1.5 : 1;
                context.fill();
                context.stroke();
            }
        };
        return {element: wrapper, redraw};
    }

    static createLevelsColumn(title, options, values, notify, setters, input, onChange) {
        const section = document.createElement("section");
        section.className = "levels-column levels-" + (input ? "input" : "output") + "-column";
        const highKey = input ? "inputHigh" : "outputHigh";
        const lowKey = input ? "inputLow" : "outputLow";
        let gradient = null;
        let controlsReady = false;
        let high;
        let low;
        const redraw = () => {
            if (gradient !== null) {
                gradient.redraw();
            }
            onChange();
        };
        high = this.createLevelsNumber(this.findControl(options, highKey), values, notify, () => {
            if (controlsReady && values[highKey] <= values[lowKey]) {
                low.setValue(values[highKey] - 1);
            }
            redraw();
        });
        low = this.createLevelsNumber(this.findControl(options, lowKey), values, notify, () => {
            if (controlsReady && values[lowKey] >= values[highKey]) {
                high.setValue(values[lowKey] + 1);
            }
            redraw();
        });
        controlsReady = true;
        setters.set(highKey, high.setValue);
        setters.set(lowKey, low.setValue);
        let gamma = null;
        if (!input) {
            gamma = this.createLevelsNumber(this.findControl(options, "gamma"), values, notify, redraw);
            gamma.element.classList.add("levels-gamma");
            setters.set("gamma", gamma.setValue);
        }
        gradient = this.createLevelsGradient(
            values,
            input,
            changes => {
                if (changes[lowKey] !== undefined) {
                    low.setValue(changes[lowKey]);
                }
                if (changes[highKey] !== undefined) {
                    high.setValue(changes[highKey]);
                }
                if (changes.gamma !== undefined) {
                    gamma.setValue(changes.gamma);
                }
                notify();
            },
            () => notify(true)
        );
        {
            // Heading
            const heading = document.createElement("h3");
            heading.textContent = title;

            // High value and gradient
            const highSwatch = document.createElement("div");
            highSwatch.className = "levels-swatch levels-swatch-white";
            section.append(heading, high.element, highSwatch, gradient.element);

            // Gamma
            if (gamma !== null) {
                const middleSwatch = document.createElement("div");
                middleSwatch.className = "levels-swatch levels-swatch-mid";
                section.append(gamma.element, middleSwatch);
            }

            // Low value
            const lowSwatch = document.createElement("div");
            lowSwatch.className = "levels-swatch levels-swatch-black";
            section.append(lowSwatch, low.element);
        }
        gradient.redraw();
        return section;
    }

    static createLevelsGradient(values, input, onChange, onCommit) {
        const element = document.createElement("div");
        element.className = "levels-vertical-track";
        const handles = Array.from({length: input ? 2 : 3}, (_, index) => {
            const handle = document.createElement("span");
            handle.className = "levels-gradient-handle";
            handle.dataset.index = index;
            element.appendChild(handle);
            return handle;
        });
        let dragging = -1;
        const positions = () => {
            if (input) {
                return [values.inputLow, values.inputHigh];
            }
            const middle = values.outputLow
                + (values.outputHigh - values.outputLow) * Math.pow(.5, 1 / values.gamma);
            return [values.outputLow, middle, values.outputHigh];
        };
        const redraw = () => {
            const current = positions();
            for (let index = 0; index < handles.length; ++index) {
                handles[index].style.top = (100 - current[index] / 255 * 100) + "%";
            }
        };
        const pointerValue = event => {
            const bounds = element.getBoundingClientRect();
            return Math.max(0, Math.min(255, Math.round((bounds.bottom - event.clientY) / bounds.height * 255)));
        };
        const update = event => {
            if (dragging < 0) {
                return;
            }
            const current = positions();
            const minimum = dragging === 0 ? 0 : Math.ceil(current[dragging - 1]) + 1;
            const maximum = dragging === current.length - 1 ? 255 : Math.floor(current[dragging + 1]) - 1;
            const value = Math.max(minimum, Math.min(maximum, pointerValue(event)));
            if (input) {
                onChange(dragging === 0 ? {inputLow: value} : {inputHigh: value});
            } else if (dragging === 0) {
                onChange({outputLow: value});
            } else if (dragging === 2) {
                onChange({outputHigh: value});
            } else {
                const ratio = (value - values.outputLow) / (values.outputHigh - values.outputLow);
                const gamma = 1 / (Math.log(ratio) / Math.log(.5));
                onChange({gamma: Math.max(.1, Math.min(10, gamma))});
            }
        };
        element.onpointerdown = event => {
            if (event.button !== 0) {
                return;
            }
            const value = pointerValue(event);
            const current = positions();
            dragging = current.reduce((closest, position, index) =>
                Math.abs(position - value) < Math.abs(current[closest] - value) ? index : closest, 0);
            element.setPointerCapture(event.pointerId);
            update(event);
        };
        element.onpointermove = event => {
            if (dragging >= 0) {
                update(event);
            }
        };
        element.onpointerup = element.onpointercancel = event => {
            if (dragging < 0) {
                return;
            }
            update(event);
            dragging = -1;
            if (element.hasPointerCapture(event.pointerId)) {
                element.releasePointerCapture(event.pointerId);
            }
            onCommit();
        };
        return {element, redraw};
    }

    static createLevelsNumber(control, values, notify, onSet = null) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = control.min;
        input.max = control.max;
        input.step = control.step;
        const set = value => {
            const numeric = Math.max(control.min, Math.min(control.max, Number(value)));
            values[control.key] = numeric;
            input.value = numeric.toFixed(control.step < 1 ? 2 : 0);
            if (onSet !== null) {
                onSet();
            }
        };
        input.oninput = () => { set(input.value); notify(); };
        input.onchange = () => notify(true);
        set(values[control.key]);
        const element = NumberInput.wrap(input);
        return {element, setValue: set};
    }

    static createCurveEditor(control, values, notify) {
        const canvas = document.createElement("canvas");
        canvas.className = "effect-curve-editor";
        canvas.width = control.width || 300;
        canvas.height = control.height || 220;
        let dragging = -1;

        const normalizedPoints = points => points
            .map(point => [
                Math.max(0, Math.min(255, Number(point[0]))),
                Math.max(0, Math.min(255, Number(point[1])))
            ])
            .sort((a, b) => a[0] - b[0]);
        const draw = () => {
            const context = canvas.getContext("2d");
            const width = canvas.width;
            const height = canvas.height;
            context.clearRect(0, 0, width, height);
            context.fillStyle = this.themeColor("--color-curve-background", "#171717");
            context.fillRect(0, 0, width, height);
            context.strokeStyle = this.themeColor("--color-curve-grid", "#8b8b8b");
            context.lineWidth = 1;
            context.setLineDash([3, 2]);
            for (let index = 1; index < 4; ++index) {
                const x = Math.round(width * index / 4) + .5;
                const y = Math.round(height * index / 4) + .5;
                context.beginPath();
                context.moveTo(x, 0); context.lineTo(x, height);
                context.moveTo(0, y); context.lineTo(width, y);
                context.stroke();
            }
            context.beginPath();
            context.moveTo(0, height);
            context.lineTo(width, 0);
            context.stroke();
            context.setLineDash([]);
            const points = values[control.key];
            context.strokeStyle = this.themeColor("--color-curve-line", "#f2f2f2");
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(points[0][0] / 255 * width, height - points[0][1] / 255 * height);
            for (let index = 1; index < points.length - 1; ++index) {
                const x = points[index][0] / 255 * width;
                const y = height - points[index][1] / 255 * height;
                const nextX = points[index + 1][0] / 255 * width;
                const nextY = height - points[index + 1][1] / 255 * height;
                context.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
            }
            if (points.length > 1) {
                const last = points[points.length - 1];
                context.lineTo(last[0] / 255 * width, height - last[1] / 255 * height);
            }
            context.stroke();
            for (let index = 1; index < points.length - 1; ++index) {
                const point = points[index];
                const x = point[0] / 255 * width;
                const y = height - point[1] / 255 * height;
                context.fillStyle = this.themeColor("--color-curve-point", "#fff");
                context.strokeStyle = this.themeColor("--color-curve-point-border", "#111");
                context.beginPath();
                context.arc(x, y, 4, 0, Math.PI * 2);
                context.fill();
                context.stroke();
            }
        };
        const eventPoint = event => {
            const bounds = canvas.getBoundingClientRect();
            return [
                Math.round((event.clientX - bounds.left) / bounds.width * 255),
                Math.round((bounds.bottom - event.clientY) / bounds.height * 255)
            ];
        };
        const movePoint = (index, point) => {
            const points = values[control.key];
            const minX = index === 0 ? 0 : points[index - 1][0] + 1;
            const maxX = index === points.length - 1 ? 255 : points[index + 1][0] - 1;
            points[index] = [Math.max(minX, Math.min(maxX, point[0])), Math.max(0, Math.min(255, point[1]))];
            draw();
            notify();
        };
        canvas.onpointerdown = event => {
            const point = eventPoint(event);
            const points = values[control.key];
            let closest = -1;
            let distance = 12;
            for (let index = 0; index < points.length; ++index) {
                const delta = Math.hypot(points[index][0] - point[0], points[index][1] - point[1]);
                if (delta < distance) { closest = index; distance = delta; }
            }
            if (closest === -1) {
                points.push(point);
                points.sort((a, b) => a[0] - b[0]);
                closest = points.indexOf(point);
            }
            dragging = closest;
            canvas.setPointerCapture(event.pointerId);
            movePoint(dragging, point);
        };
        canvas.onpointermove = event => {
            if (dragging !== -1) {
                movePoint(dragging, eventPoint(event));
            }
        };
        canvas.onpointerup = canvas.onpointercancel = () => dragging = -1;
        canvas.oncontextmenu = event => {
            event.preventDefault();
            const point = eventPoint(event);
            const points = values[control.key];
            let closest = -1;
            let distance = 12;
            for (let index = 1; index < points.length - 1; ++index) {
                const delta = Math.hypot(points[index][0] - point[0], points[index][1] - point[1]);
                if (delta < distance) { closest = index; distance = delta; }
            }
            if (closest !== -1) {
                points.splice(closest, 1);
                draw();
                notify();
            }
        };
        const setValue = points => {
            values[control.key] = normalizedPoints(points.map(point => [...point]));
            draw();
        };
        setValue(values[control.key]);
        return {element: canvas, setValue};
    }
}
