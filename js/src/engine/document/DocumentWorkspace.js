class DocumentWorkspace extends DocumentView {

    constructor(app) {
        super(app);

        this.filePath = null;
    }

    getFriendlyName() {
        return this.filePath === null
            ? i18n("untitled.friendlyName")
            : this.filePath; // TODO: get file name from path
    }
}