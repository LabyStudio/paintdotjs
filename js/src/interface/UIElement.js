class UIElement {

    constructor(id) {
        this.id = id;
        this.parent = null;
        this.app = app;
    }

    initialize(parent) {
        this.parent = parent;
    }

}