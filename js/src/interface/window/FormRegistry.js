class FormRegistry {

    static {
        this.forms = {};
    }

    static initialize() {
        FormRegistry.register(new ToolForm());
        FormRegistry.register(new ColorsForm());
        FormRegistry.register(new LayerForm());
        FormRegistry.register(new HistoryForm());
    }

    static register(form) {
        this.forms[form.id] = form;

        if (isApp) {
            // TODO create window on operating system
        }

        let window = new WebWindow(form.id);
        form.initialize(window);
        form.initializeDefault(window);
        const shouldOpen = window.restoreState();
        window.enablePersistence();
        form.postInitialize();
        if (shouldOpen) {
            window.create();
        } else {
            window.notifyOpenState();
        }
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
