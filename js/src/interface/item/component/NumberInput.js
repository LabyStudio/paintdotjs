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
            if (input.disabled || input.readOnly) return;
            const previous = input.value;
            if (direction > 0) input.stepUp(); else input.stepDown();
            if (input.value === previous) return;
            input.dispatchEvent(new Event("input", {bubbles: true}));
            input.dispatchEvent(new Event("change", {bubbles: true}));
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
}
