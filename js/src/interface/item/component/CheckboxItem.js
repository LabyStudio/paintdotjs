class CheckboxItem extends Item {

    constructor(id = null) {
        super(id);

        this.changeCallback = null;
        this.checked = false;
    }

    buildElement() {
        let element = document.createElement("input");
        if (this.id !== null) {
            element.id = this.id;
        }
        element.type = "checkbox";
        element.checked = this.checked;
        element.oninput = _ => {
            this.checked = element.checked;

            if (this.changeCallback !== null) {
                this.changeCallback(this.text);
            }
        };
        return element;
    }

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

    isChecked() {
        return this.checked;
    }

    isClickable() {
        return false;
    }

}