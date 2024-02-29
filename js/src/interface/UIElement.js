class UIElement {

    constructor(id) {
        this.id = id;
        this.parent = null;
    }

    initialize(parent) {
        this.parent = parent;
    }

}