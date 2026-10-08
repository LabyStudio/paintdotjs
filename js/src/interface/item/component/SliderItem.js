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

class SliderItem extends Item {

    constructor(id) {
        super(id);

        this.changeCallback = null;
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
        if (this.changeCallback !== null) {
            this.changeCallback(value);
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

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

}