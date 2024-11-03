class FormRegistry {

    static {
        this.forms = {};

        // Keep windows in bounds
        window.addEventListener("resize", () => {
            for (let form of this.list()) {
                form.window.setPosition(form.window.x, form.window.y);
            }
        });
    }

    static initialize() {
        FormRegistry.register(new ToolForm());
        FormRegistry.register(new ColorsForm());
        FormRegistry.register(new LayerForm());
    }

    static register(form) {
        this.forms[form.id] = form;

        if (isApp) {
            // TODO create window on operating system
        }

        let window = new WebWindow();
        form.initialize(window);
        window.create();
    }

    static unregister(id) {
        delete this.forms[id];
    }

    static get(id) {
        if (!this.forms.hasOwnProperty(id)) {
            return null;
        }
        return this.forms[id];
    }

    static list() {
        return Object.values(this.forms);
    }
}