class TextFieldItem extends Item {

    constructor(id, callback = null) {
        super(id, callback);
    }

    buildElement() {
        let element = document.createElement("input");
        element.type = "text";
        element.id = this.id;
        element.value = "100%";

        setTimeout(_ => {
            element.focus();
            element.select();
        });

        return element;
    }

    isImplemented() {
        return true;
    }

    isClickable() {
        return false;
    }

}