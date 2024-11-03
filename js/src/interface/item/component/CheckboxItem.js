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
        element.addEventListener("mousedown", event => {
            event.stopPropagation();
            event.preventDefault();
        });
        element.oninput = event => {
            this.checked = element.checked;

            if (this.changeCallback !== null) {
                this.changeCallback(this.checked);
            }

            event.stopPropagation();
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