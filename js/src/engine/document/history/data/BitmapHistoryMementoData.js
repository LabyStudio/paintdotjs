class BitmapHistoryMementoData extends HistoryMementoData {

    constructor(undoImage, savedRegion) {
        super();

        this.undoImage = undoImage;
        this.savedRegion = savedRegion;
    }

}