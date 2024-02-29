class Menu extends Panel {

    constructor(elementId, configuration) {
        super(elementId);

        this.items = configuration.items ?? [];
    }

    initialize(parent) {
        super.initialize(parent);

        for (let item of this.items) {
            item.initialize(this);
            this.element.appendChild(item.getElement());
        }
    }

    add(item) {
        this.items[item.id] = item;
        item.initialize(this);
        this.element.appendChild(item.getElement());
    }
}