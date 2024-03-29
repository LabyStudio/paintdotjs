class LabelMenuItem extends ActionItem {

    constructor(id) {
        super(id);
    }

    buildElement() {
        let wrapper = document.createElement("div");
        wrapper.className = "label-menu-item";
        {
            // Icon
            if (this.hasIconImage) {
                let icon = document.createElement("img");
                icon.className = "icon";
                icon.src = "assets/icons/" + this.getIconPath();
                icon.onerror = event => {
                    icon.style.opacity = '0';
                }
                wrapper.appendChild(icon);
            }

            // Text
            let element = super.buildElement();
            element.className += " label";
            wrapper.appendChild(element);
        }
        return wrapper;
    }

    updateText(text = this.getText()) {
        if (this.element === null) {
            return;
        }
        this.element.children[1].innerHTML = text;
    }

    isClickable() {
        return false;
    }

}