class CursorPositionItem extends LabelMenuItem {

    constructor() {
        super("cursorPositionItem");

        this.withIconPathKey("cursor_x_y_icon", true);
    }

    getText() {
        return "0, 0";
    }

}