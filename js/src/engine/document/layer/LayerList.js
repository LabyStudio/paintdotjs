class LayerList {

    constructor(document) {
        this.document = document;
        this.layers = [];

        this.changing = new EventHandler();
        this.changed = new EventHandler();
    }

    getAt(index) {
        return this.layers[index];
    }

    getLayerCount() {
        return this.layers.length;
    }

    addLayer(layer) {
        this.insertLayerAt(this.layers.length, layer);
    }

    insertLayerAt(index, layer) {
        this.changing.fire(this);
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
        this.changing.fire(this);
        this.layers.splice(index, 1);
        this.changed.fire(this);
    }

    indexOf(layer) {
        if (layer === null) {
            throw new Error("layer is null");
        }
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