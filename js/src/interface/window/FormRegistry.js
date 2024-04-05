class FormRegistry {

    static {
        this.forms = {};
    }

    static initialize() {
        FormRegistry.register(new ToolForm());
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
        return this.forms[id];
    }

    static list() {
        return Object.values(this.forms);
    }
}