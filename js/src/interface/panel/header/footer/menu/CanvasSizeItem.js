class CanvasSizeItem extends LabelMenuItem {

    constructor() {
        super("canvasSizeItem");

        this.withIconPathKey("image_size_icon", true);
    }

    getText() {
        return "0 x 0";
    }

}