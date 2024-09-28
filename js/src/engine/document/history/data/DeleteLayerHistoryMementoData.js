class DeleteLayerHistoryMementoData extends HistoryMementoData {

    constructor(layer) {
        super();
        this.layer = layer;
    }

    getLayer() {
        return this.layer;
    }
}