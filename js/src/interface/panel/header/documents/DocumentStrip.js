class DocumentStrip extends Panel {

    constructor() {
        super("documentStrip");

        this.scrollSession = new ScrollSession();
        this.thumbnailUpdates = new Debounced();

        this.app.on("app:create_document", (documentWorkspace) => {
            this.documentsListItem.add(this.createDocumentItem(documentWorkspace));
            this.documentsListItem.reinitialize();
            this.updateActiveDocument();
        });
        this.app.on("app:update_active_document", () => {
            this.documentsListItem.reinitialize();
            this.updateActiveDocument();
        });
        this.app.on("app:close_document", (documentWorkspace) => {
            this.documentsListItem.items = this.documentsListItem.items.filter(item =>
                item.getDocumentWorkspace() !== documentWorkspace
            );
            this.documentsListItem.selectedItem = this.getItemByDocumentWorkspace(
                this.app.getActiveDocumentWorkspace()
            );
            this.documentsListItem.reinitialize();
        });
        this.app.on("document:dirty_changed", (documentWorkspace) => {
            const item = this.getItemByDocumentWorkspace(documentWorkspace);
            if (item !== null) item.updateDirtyIndicator();
        });
        this.app.on("document:file_changed", (documentWorkspace) => {
            const item = this.getItemByDocumentWorkspace(documentWorkspace);
            if (item !== null) item.reinitialize();
        });
        this.app.on("document:render_layer_region", (layer, region) => {
            if (!(layer instanceof BitmapLayer)) {
                return;
            }
            const documentWorkspace = layer.getDocumentWorkspace();
            this.thumbnailUpdates.debounceTimeout(documentWorkspace, 80, () => {
                let item = this.getItemByDocumentWorkspace(documentWorkspace);
                if (item !== null) {
                    item.renderThumbnail();
                }
            });
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
                let item = this.createDocumentItem(documentWorkspace);
                this.documentsListItem.add(item);

                if (documentWorkspaces === this.app.getActiveDocumentWorkspace()) {
                    this.documentsListItem.setSelected(item);
                }
            }
        }
        this.documentsListItem.appendTo(this.element, this);
    }

    createDocumentItem(documentWorkspace) {
        const item = new DocumentItem(documentWorkspace);
        item.setContextMenuCallback(event => {
            const previousWorkspace = this.app.getActiveDocumentWorkspace();
            if (previousWorkspace !== documentWorkspace) {
                this.app.setActiveDocumentWorkspace(documentWorkspace);
            }
            DocumentContextMenu.show(event.clientX, event.clientY, documentWorkspace, previousWorkspace);
        });
        return item;
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
