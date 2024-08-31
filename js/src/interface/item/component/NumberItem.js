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
        let element = super.buildElement();
        element.type = "number";
        element.min = this.min;
        element.max = this.max;
        element.step = this.step;
        element.value = this.value;
        return element;
    }

    setChangeCallback(callback) {
        super.setChangeCallback(string => {
            callback(this.value = Number(string));
        });
    }

    setMin(min) {
        this.min = min;
        if (this.element !== null) {
            this.element.min = min;
        }
    }

    setMax(max) {
        this.max = max;
        if (this.element !== null) {
            this.element.max = max;
        }
    }

    setStep(step) {
        this.step = step;
        if (this.element !== null) {
            this.element.step = step;
        }
    }

    setValue(value) {
        this.value = value;
        if (this.element !== null) {
            this.element.value = value;
        }
    }

    getValue() {
        return this.value;
    }

}