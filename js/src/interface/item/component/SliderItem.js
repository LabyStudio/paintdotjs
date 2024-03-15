class SliderItem extends Item {

    constructor(id, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let wrapper = document.createElement("div");
        wrapper.classList.add("slider-wrapper");
        {
            let element = document.createElement("input");
            element.type = "range";
            element.id = this.id;
            element.value = this.getCurrentValue() + "";
            element.setAttribute("min", this.getMin() + "");
            element.setAttribute("max", this.getMax() + "");
            element.setAttribute("step", this.getStep() + "");
            element.oninput = () => {
                this.onChange(element.value);
            }
            wrapper.appendChild(element);

            if (this.getTicks().length > 0) {
                for (let tick of this.getTicks()) {
                    let tickElement = document.createElement("div");
                    tickElement.classList.add("slider-tick");
                    tickElement.style.left = tick + "%";
                    wrapper.appendChild(tickElement);
                }
            }
        }
        return wrapper;
    }

    onChange(value) {
        if (this.callback !== null && this.callback !== undefined) {
            this.callback(value);
        }
    }

    updateCurrentValue(value = this.getCurrentValue()) {
        this.element.children[0].value = Math.round(value) + "";
    }

    getCurrentValue() {
        return 50;
    }

    getMin() {
        return 0;
    }

    getMax() {
        return 100;
    }

    getStep() {
        return 1;
    }

    getTicks() {
        return [];
    }

    isImplemented() {
        return true;
    }

    isClickable() {
        return false;
    }

}