class LayerListItem extends Item {

    constructor(id) {
        super(id);

        this.layers = [];
        this.selectedLayer = null;
        this.enabled = true;

        this.layerItemMap = new Map();
    }

    buildElement() {
        let element = document.createElement("div");
        element.id = this.id;

        this.layerItemMap.clear();
        for (let layer of this.layers) {
            if (this.selectedLayer === null) {
                this.selectedLayer = layer;
            }

            let layerItem = new LayerItem(layer);
            layerItem.setSelected(layer === this.selectedLayer);
            layerItem.renderThumbnail();
            layerItem.initialize(this);
            element.appendChild(layerItem.buildElement());
            this.layerItemMap.set(layer, layerItem);
        }

        return element;
    }

    addLayer(layer) {
        this.layers.push(layer);
    }

    setSelectedLayer(layer) {
        this.selectedLayer = layer;
        this.updateDocument();
    }

    getLayerItem(layer) {
        let item = this.layerItemMap.get(layer);
        return item !== undefined ? item : null;
    }

    isClickable() {
        return false;
    }

}