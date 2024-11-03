class Form {

    constructor(id) {
        this.id = id;
        this.window = null;
        this.app = app;
    }

    initialize(window) {
        this.window = window;

        window.setTitle(this.getTitle());
        window.setSize(300, 300);

        this.updateContent();
    }

    getTitle() {
        return i18n(this.id + ".text");
    }

    buildContent() {
        return document.createElement("div");
    }

    updateContent() {
        this.window.setContent(this.buildContent());
    }

    getWindow() {
        return this.window;
    }
}