class TextFieldItem extends Item {

    constructor(id) {
        super(id);

        this.changeCallback = null;
        this.submitCallback = null;
        this.text = "";
        this.autoSelect = false;
    }

    buildElement() {
        let element = document.createElement("input");
        element.type = "text";
        element.id = this.id;
        element.value = this.text;
        element.oninput = _ => {
            this.text = element.value

            if (this.changeCallback !== null) {
                this.changeCallback(this.text);
            }
        };

        // Listen on enter
        element.onkeydown = e => {
            if (e.key === "Enter") {
                if (this.submitCallback !== null) {
                    this.submitCallback(this.text);
                }
            }
        };

        // Auto select text
        if (this.autoSelect) {
            setTimeout(_ => {
                element.focus();
                element.select();

                let initial = true;
                element.onclick = e => {
                    // Set cursor at end at the first time clicked
                    if (initial) {
                        initial = false;
                        element.selectionStart = element.selectionEnd = element.value.length;
                    }

                    // Prevent closing drop menu
                    e.stopPropagation();
                };
            });
        }

        return element;
    }

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

    setSubmitCallback(callback) {
        this.submitCallback = callback;
    }

    setText(text) {
        this.text = text;

        if (this.element !== null) {
            this.element.value = text;
        }
    }

    setAutoSelect(autoSelect) {
        this.autoSelect = autoSelect;
    }

    getText() {
        return this.text;
    }

    isClickable() {
        return false;
    }

}