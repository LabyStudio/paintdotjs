class DocumentStrip extends Panel {

    constructor() {
        super("documentStrip");

        this.scrollSession = new ScrollSession();

        this.app.on("app:create_document", (documentWorkspace) => {
            this.documentsListItem.add(new DocumentItem(documentWorkspace));
            this.documentsListItem.reinitialize();
            this.updateActiveDocument();
        });
        this.app.on("document:invalidated", () => {
            this.documentsListItem.reinitialize();
        });
        this.app.on("app:update_active_document", () => {
            this.documentsListItem.reinitialize();
            this.updateActiveDocument();
        });
        this.app.on("document:render_layer_region", (layer, region) => {
            if (!(layer instanceof BitmapLayer)) {
                return;
            }
            let item = this.getItemByDocumentWorkspace(layer.getDocumentWorkspace());
            if (item !== null) {
                item.renderThumbnail();
            }
        });
    }

    initialize(parent) {
        super.initialize(parent);

        this.documentsListItem = new ScrollList(ScrollOrientation.HORIZONTAL, "documentsList", this.scrollSession);
        this.documentsListItem.setSelectCallback((item) => {
            let documentWorkspace = item.getDocumentWorkspace();
            if (documentWorkspace !== null) {
                this.app.setActiveDocumentWorkspace(documentWorkspace);
            }
        });
        {
            let documentWorkspaces = this.app.getDocumentWorkspaces();
            for (let documentWorkspace of documentWorkspaces) {
                let item = new DocumentItem(documentWorkspace);
                this.documentsListItem.add(item);

                if (documentWorkspaces === this.app.getActiveDocumentWorkspace()) {
                    this.documentsListItem.setSelected(item);
                }
            }
        }
        this.documentsListItem.appendTo(this.element, this);
    }

    updateActiveDocument() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        let item = this.getItemByDocumentWorkspace(activeDocumentWorkspace);
        if (item !== null) {
            this.documentsListItem.setSelected(item);
        }
    }

    getItemByDocumentWorkspace(documentWorkspace) {
        if (this.documentsListItem === null) {
            return null;
        }
        for (let item of this.documentsListItem.items) {
            if (item.getDocumentWorkspace() === documentWorkspace) {
                return item;
            }
        }
        return null;
    }
}