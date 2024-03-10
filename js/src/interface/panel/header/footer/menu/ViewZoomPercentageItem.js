class ViewZoomPercentageItem extends DropMenuItem {

    constructor() {
        super("zoomPercentageItem");

        this.add(new TextFieldItem("zoomPercentageField"));
    }

    isDropUp() {
        return true;
    }

    getText() {
        return "100%";
    }
}