class NumberItem extends TextFieldItem {

    constructor(id) {
        super(id);

        this.changeCallback = null;
        this.submitCallback = null;
        this.text = "";
        this.min = 0;
        this.max = 100;
        this.step = 1;
        this.value = 0;
    }

    buildElement() {
        this.input = super.buildElement();
        this.input.type = "number";
        this.input.min = this.min;
        this.input.max = this.max;
        this.input.step = this.step;
        this.input.value = this.value;
        return NumberInput.wrap(this.input);
    }

    setChangeCallback(callback) {
        super.setChangeCallback(string => {
            callback(this.value = Number(string));
        });
    }

    setMin(min) {
        this.min = min;
        if (this.input !== undefined) {
            this.input.min = min;
        }
    }

    setMax(max) {
        this.max = max;
        if (this.input !== undefined) {
            this.input.max = max;
        }
    }

    setStep(step) {
        this.step = step;
        if (this.input !== undefined) {
            this.input.step = step;
        }
    }

    setValue(value) {
        this.value = value;
        this.text = String(value);
        if (this.input !== undefined) {
            this.input.value = value;
        }
    }

    setText(value) {
        this.setValue(value);
    }

    setEnabled(enabled) {
        super.setEnabled(enabled);
        if (this.input !== undefined) this.input.disabled = !enabled;
    }

    getValue() {
        return this.value;
    }

}
