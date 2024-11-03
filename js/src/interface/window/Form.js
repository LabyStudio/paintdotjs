class Form extends Debounced {

    constructor(id) {
        super();
        this.id = id;
        this.window = null;
        this.app = app;
    }

    initializeDefault(window) {

    }

    initialize(window) {
        this.window = window;

        window.setTitle(this.getTitle());

        this.window.setContent(this.buildContent());
    }

    postInitialize() {

    }

    reinitialize() {
        this.debounce("reinitialize", () => {
            this.initialize(this.window);
            this.postInitialize();
        });
    }

    getTitle() {
        return i18n(this.id + ".text");
    }

    buildContent() {
        return document.createElement("div");
    }

    getWindow() {
        return this.window;
    }
}