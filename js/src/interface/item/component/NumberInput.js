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

class NumberInput {

    static wrap(input) {
        if (input._numberInputWrapper) return input._numberInputWrapper;
        if (!(input instanceof HTMLInputElement) || input.type !== "number") {
            throw new TypeError("NumberInput.wrap expects an input[type=number]");
        }

        const wrapper = document.createElement("span");
        wrapper.className = "pdn-number-input";
        const buttons = document.createElement("span");
        buttons.className = "pdn-number-input-buttons";
        const up = this.createButton(input, 1, "Increase value");
        const down = this.createButton(input, -1, "Decrease value");
        const updateDisabledState = () => {
            const disabled = input.disabled || input.readOnly;
            up.disabled = disabled;
            down.disabled = disabled;
        };
        new MutationObserver(updateDisabledState).observe(input, {
            attributes: true,
            attributeFilter: ["disabled", "readonly"]
        });
        updateDisabledState();
        this.enableKeyboardStepping(input);
        buttons.append(up, down);
        wrapper.append(input, buttons);
        input._numberInputWrapper = wrapper;
        return wrapper;
    }

    static createButton(input, direction, label) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = direction > 0
            ? "pdn-number-input-up" : "pdn-number-input-down";
        button.tabIndex = -1;
        button.setAttribute("aria-label", label);

        let repeatDelay = null;
        let repeatInterval = null;
        const stopRepeating = () => {
            if (repeatDelay !== null) clearTimeout(repeatDelay);
            if (repeatInterval !== null) clearInterval(repeatInterval);
            repeatDelay = null;
            repeatInterval = null;
        };
        const step = () => {
            this.stepInput(input, direction);
        };
        button.onpointerdown = event => {
            if (event.button !== 0 || input.disabled || input.readOnly) return;
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            input.focus({preventScroll: true});
            step();
            repeatDelay = setTimeout(() => {
                repeatInterval = setInterval(step, 65);
            }, 400);
        };
        button.onpointerup = button.onpointercancel = stopRepeating;
        button.onlostpointercapture = stopRepeating;
        button.onclick = event => event.preventDefault();
        return button;
    }

    static enableKeyboardStepping(input, customStep = null) {
        if (input._numberInputKeyboardStepping) return;
        input._numberInputKeyboardStepping = true;
        input.addEventListener("keydown", event => {
            if ((event.key !== "ArrowUp" && event.key !== "ArrowDown")
                || event.altKey || event.ctrlKey || event.metaKey
                || input.disabled || input.readOnly || event.isComposing) return;

            event.preventDefault();
            const direction = event.key === "ArrowUp" ? 1 : -1;
            if (customStep === null) this.stepInput(input, direction);
            else customStep(direction);
        });
    }

    static stepInput(input, direction) {
        if (input.disabled || input.readOnly) return false;
        const previous = input.value;
        if (direction > 0) input.stepUp(); else input.stepDown();
        if (input.value === previous) return false;
        input.dispatchEvent(new Event("input", {bubbles: true}));
        input.dispatchEvent(new Event("change", {bubbles: true}));
        return true;
    }
}
