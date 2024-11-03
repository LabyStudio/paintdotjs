class LayerForm extends Form {

    constructor() {
        super("layerForm");

        this.layerListItem = null;
        this.stripPanel = null;

        this.scrollSession = new ScrollSession();

        this.app.on("app:update_active_document", () => {
            this.reinitialize();
        });
        this.app.on("document:invalidated", () => {
            this.reinitialize();
        });
        this.app.on("document:render_layer_region", (layer, region) => {
            let item = this.getItemByLayer(layer);
            if (item !== null) {
                item.renderThumbnail();
            }
        });
    }

    initializeDefault(window) {
        window.setSize(180, 256);
        window.setAnchor(1, 1);
    }

    postInitialize() {
        super.postInitialize();

        this.layerListItem.postInitialize();
    }

    buildContent() {
        let element = super.buildContent();
        element.id = "layerForm";

        // Layer list
        this.layerListItem = new ScrollList("layerList", this.scrollSession);
        this.layerListItem.setScrollSpeed(0.4);
        this.layerListItem.setSelectCallback((item) => {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null) {
                activeDocumentWorkspace.setActiveLayer(item.getLayer());
                this.updateActionEnabledStates();
            }
        });
        this.layerListItem.setItemSwapper((item1, item2) => {
            let documentWorkspace = this.app.getActiveDocumentWorkspace();
            if (documentWorkspace !== null) {
                let document = documentWorkspace.getDocument();

                let layers = document.getLayers();
                let index1 = layers.indexOf(item1.getLayer());
                let index2 = layers.indexOf(item2.getLayer());

                let swapLayerFunction = new SwapLayerFunction(index1, index2);
                documentWorkspace.executeFunction(swapLayerFunction);

                this.layerListItem.scrollToItem(item2);
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
                    this.layerListItem.addAt(0, new LayerItem(layer));
                }

                // Set the selected layer to the active layer of the active document
                let item = this.getItemByLayer(activeDocumentWorkspace.getActiveLayer());
                this.layerListItem.setSelected(item, true);
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
                    documentWorkspace.performAction(new MergeLayerDownAction());
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

    getItemByLayer(layer) {
        if (this.layerListItem === null) {
            return null;
        }
        for (let item of this.layerListItem.items) {
            if (item.getLayer() === layer) {
                return item;
            }
        }
        return null;
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