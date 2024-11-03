class HistoryMementoItem extends MenuItem {

    constructor(type, memento) {
        super();

        this.type = type;

        this.memento = memento;
        this.enabled = true;
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " history-item " + (this.type === ItemType.UNDO ? "undo" : "redo");
        {
            // Icon
            let icon = document.createElement("img");
            icon.className = "icon";
            icon.src = this.memento.getImage();
            element.appendChild(icon);

            // Name
            let name = document.createElement("span");
            name.innerHTML = this.memento.getName();
            element.appendChild(name);
        }
        return element;
    }

    getText() {
        return null;
    }

    getType() {
        return this.type;
    }

    getMemento() {
        return this.memento;
    }

    getKey() {
        return this.memento;
    }
}