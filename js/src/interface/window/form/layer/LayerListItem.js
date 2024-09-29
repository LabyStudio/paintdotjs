class LayerListItem extends Item {

    constructor(id) {
        super(id);

        this.layers = [];
        this.selectedLayer = null;
        this.selectCallback = null;
        this.enabled = true;

        this.layerItemMap = new Map();
        this.previousScrollPosition = 0;
    }

    buildElement() {
        this.previousScrollPosition = this.element === null ? 0 : this.element.scrollTop;

        // Scroll
        let scroll = document.createElement("div");
        scroll.id = this.id;
        scroll.className = "layer-list-scroll";
        {
            // Content
            let element = document.createElement("div");
            element.className = "layer-list-content";

            this.layerItemMap.clear();
            for (let layer of this.layers) {
                // Set the selected layer to the first layer if it is not set
                if (this.selectedLayer === null) {
                    this.selectedLayer = layer;
                }

                // Layer item
                let layerItem = new LayerItem(layer);
                layerItem.setSelected(layer === this.selectedLayer);
                layerItem.setPressable(() => {
                    this.selectedLayer = layer;
                    if (this.selectCallback !== null) {
                        this.selectCallback(layer);
                    }
                    this.reinitialize();
                });
                layerItem.appendTo(element, this);
                this.layerItemMap.set(layer, layerItem);
            }

            scroll.appendChild(element);
        }
        return scroll;
    }

    postInitialize() {
        this.element.scrollTop = this.previousScrollPosition;
    }

    addLayer(layer) {
        this.layers.push(layer);
    }

    setSelectedLayer(layer) {
        this.selectedLayer = layer;
        this.reinitialize();
    }

    setSelectCallback(callback) {
        this.selectCallback = callback;
    }

    getLayerItem(layer) {
        let item = this.layerItemMap.get(layer);
        return item !== undefined ? item : null;
    }

    isImplemented() {
        return true;
    }
}