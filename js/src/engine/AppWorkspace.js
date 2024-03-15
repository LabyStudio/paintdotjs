class AppWorkspace extends AppView {

    constructor() {
        super();

        this.documentWorkspaces = [];
        this.activeDocumentWorkspace = null;
    }

    initialize() {
        super.initialize();
    }

    createBlankDocumentInNewWorkspace(width, height) {
        // Create document workspace
        let documentWorkspace = new DocumentWorkspace(this);

        // Create document with initial size
        let document = new Document(width, height);
        documentWorkspace.setDocument(document);
        documentWorkspace.fitVisibleDocumentRectangle();

        // Add default background layer
        let backgroundLayer = Layer.createBackgroundLayer(width, height);
        document.addLayer(backgroundLayer);

        // TODO improve invalidating?
        document.invalidate();
        documentWorkspace.update();

        // Add document workspace to list
        this.documentWorkspaces.push(documentWorkspace);

        // Set active document workspace
        if (this.activeDocumentWorkspace == null || this.documentWorkspaces.length === 0) {
            this.setActiveDocumentWorkspace(documentWorkspace);
        }

        // Update title
        this.updateTitle();

        return documentWorkspace;
    }

    setActiveDocumentWorkspace(documentWorkspace) {
        this.activeDocumentWorkspace = documentWorkspace;
        this.updateTitle();
    }

    updateTitle() {
        if (this.activeDocumentWorkspace === null) {
            setTitle(PdjInfo.productName());
        } else {
            let name = this.activeDocumentWorkspace.getFriendlyName();

            let title = i18n("mainForm.title.format")
                .replace("{0}", name)
                .replace("{1}", PdjInfo.productName() + " " + PdjInfo.version() + " " + (isApp ? "App" : "Web"));
            setTitle(title);
        }
    }

    getActiveDocumentWorkspace() {
        return this.activeDocumentWorkspace;
    }


}