class LayerList {

    constructor(document) {
        this.document = document;
        this.layers = [];

        this.changed = new EventHandler();
    }

    getAt(index) {
        return this.layers[index];
    }

    getLayerCount() {
        return this.layers.length;
    }

    addLayer(layer) {
        this.insertLayer(this.layers.length, layer);
    }

    insertLayer(index, layer) {
        this.layers.splice(index, 0, layer);
        this.changed.fire(this);
    }

    removeLayer(layer) {
        let index = this.layers.indexOf(layer);
        if (index !== -1) {
            this.removeLayerAt(index);
        }
    }

    removeLayerAt(index) {
        this.layers.splice(index, 1);
    }

    indexOf(layer) {
        return this.layers.indexOf(layer);
    }

    clear() {
        this.layers = [];
    }

    list() {
        return this.layers;
    }

    size() {
        return this.layers.length;
    }
}