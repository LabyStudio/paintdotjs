class ZoomItem extends DropMenuItem {

    constructor() {
        super("zoomItem");

        this.add(new TextFieldItem("zoomField"));
    }

    isDropUp() {
        return true;
    }

    getText() {
        return "100%";
    }
}