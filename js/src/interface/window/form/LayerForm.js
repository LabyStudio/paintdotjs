class LayerForm extends Form {

    constructor() {
        super("layerForm");

        this.layerListItem = null;

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
            }
        });
        {
            let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
            if (activeDocumentWorkspace !== null) {
                let document = activeDocumentWorkspace.getDocument();
                let layers = document.getLayers();
                for (let layer of layers.list()) {
                    this.layerListItem.addLayer(layer);
                }
                this.layerListItem.setSelectedLayer(activeDocumentWorkspace.getActiveLayer());
            }
        }
        this.layerListItem.appendTo(element, this);

        // Footer strip panel
        let stripPanel = new StripPanel("layerStripPanel", {
            items: [
                LayerForm.ref("add.new.layer", "addNewLayerButton", () => {
                    let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
                    if (activeDocumentWorkspace !== null) {
                        activeDocumentWorkspace.executeFunction(new AddNewBlankLayerFunction());
                    }
                }),
                LayerForm.ref("delete.layer", "deleteLayerButton", () => {

                }),
                LayerForm.ref("duplicate.layer", "duplicateLayerButton", () => {

                }),
                LayerForm.ref("merge.layer.down", "mergeLayerDownButton", () => {

                }),
                LayerForm.ref("move.layer.up", "moveLayerUpButton", () => {

                }),
                LayerForm.ref("move.layer.down", "moveLayerDownButton", () => {

                }),
                LayerForm.ref("layer.properties", "propertiesButton", () => {

                }),
            ]
        });
        stripPanel.appendTo(element, this);

        return element;
    }

    static ref(id, toolTip, callback) {
        let item = new IconItem("menu.layers." + id, callback);
        item.withTranslationKey("layerForm." + toolTip + ".toolTipText");
        return item;
    }
}