class LayerForm extends Form {

    constructor() {
        super("layerForm");

        this.layerListItem = null;
        this.stripPanel = null;

        this.app.on("app:update_active_document", () => {
            this.updateContent();
        });
        this.app.on("document:invalidated", () => {
            this.updateContent();
        });
        this.app.on("document:render_layer_region", (layer, region) => {
            let layerItem = this.layerListItem.getLayerItem(layer);
            if (layerItem !== null) {
                layerItem.renderThumbnail();
            }
        });
    }

    initialize(window) {
        super.initialize(window);

        let viewBounds = this.app.getViewBounds();
        window.setSize(180, 206);
        window.setPosition(
            viewBounds.getRight() - window.getWidth() - 20,
            this.app.getViewBounds().getBottom() - window.getHeight() - 20 - 5
        );
    }

    buildContent() {
        let element = super.buildContent();
        element.id = "layerForm";

        // Layer list
        this.layerListItem = new LayerListItem("layerList");
        this.layerListItem.setSelectCallback((layer) => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null) {
                activeDocumentWorkspace.setActiveLayer(layer);
                this.updateActionEnabledStates();
            }
        });
        {
            // Get the active document
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null) {
                let document = activeDocumentWorkspace.getDocument();

                // Fill the layer list with the layers of the active document
                let layers = document.getLayers();
                for (let layer of layers.list()) {
                    this.layerListItem.addLayerAt(0, layer);
                }

                // Set the selected layer to the active layer of the active document
                this.layerListItem.setSelectedLayer(activeDocumentWorkspace.getActiveLayer());
            }
        }
        this.layerListItem.appendTo(element, this);

        // Footer strip panel
        this.stripPanel = new StripPanel("layerStripPanel", {
            items: [
                this.create("add.new.layer", "addNewLayerButton", documentWorkspace => {
                    documentWorkspace.executeFunction(new AddNewBlankLayerFunction());
                }),
                this.create("delete.layer", "deleteLayerButton", documentWorkspace => {
                    let index = documentWorkspace.getActiveLayerIndex();
                    documentWorkspace.executeFunction(new DeleteLayerFunction(index));
                }),
                this.create("duplicate.layer", "duplicateLayerButton", documentWorkspace => {
                    let index = documentWorkspace.getActiveLayerIndex();
                    documentWorkspace.executeFunction(new DuplicateLayerFunction(index));
                }),
                this.create("merge.layer.down", "mergeLayerDownButton", documentWorkspace => {

                }),
                this.create("move.layer.up", "moveLayerUpButton", documentWorkspace => {
                    documentWorkspace.performAction(new MoveActiveLayerUpAction());
                }),
                this.create("move.layer.down", "moveLayerDownButton", documentWorkspace => {
                    documentWorkspace.performAction(new MoveActiveLayerDownAction());
                }),
                this.create("layer.properties", "propertiesButton", documentWorkspace => {

                }),
            ]
        });
        this.stripPanel.appendTo(element, this);

        this.updateActionEnabledStates();

        return element;
    }

    updateActionEnabledStates() {
        let activeDocumentWorkspace = app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace !== null) {
            let index = activeDocumentWorkspace.getActiveLayerIndex();
            let size = activeDocumentWorkspace.getDocument().getLayers().size();
            this.stripPanel.get("menu.layers.move.layer.up").setEnabled(index !== size - 1);
            this.stripPanel.get("menu.layers.move.layer.down").setEnabled(index !== 0);
            this.stripPanel.get("menu.layers.merge.layer.down").setEnabled(index !== 0);
            this.stripPanel.get("menu.layers.delete.layer").setEnabled(size > 1);
        }
    }

    create(id, toolTip, callback) {
        let item = new IconItem("menu.layers." + id, () => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null && item.isEnabled()) {
                callback(activeDocumentWorkspace);
            }
        });
        item.withTranslationKey("layerForm." + toolTip + ".toolTipText");
        return item;
    }
}