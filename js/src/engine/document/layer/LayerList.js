class LayerList {

    constructor(document) {
        this.document = document;
        this.layers = [];

        this.changing = new EventHandler();
        this.changed = new EventHandler();

        this.removingAt = new EventHandler();
        this.removedAt = new EventHandler();

        this.insertingAt = new EventHandler();
        this.insertedAt = new EventHandler();
    }

    getAt(index) {
        let layer = this.layers[index];
        return typeof layer !== "undefined" ? layer : null;
    }

    getLayerCount() {
        return this.layers.length;
    }

    addLayer(layer) {
        this.insertLayerAt(this.layers.length, layer);
    }

    setLayerAt(index, layer) {
        // Note: Do not fire any events here because we invalidate the layer after swapping
        this.layers[index] = layer;
    }

    insertLayerAt(index, layer) {
        this.changing.fire(this);
        this.insertingAt.fire(index);
        this.layers.splice(index, 0, layer);
        this.insertedAt.fire(index);
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
        this.removingAt.fire(index);
        this.layers.splice(index, 1);
        this.removedAt.fire(index);
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