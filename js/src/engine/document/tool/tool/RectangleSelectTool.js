class RectangleSelectTool extends SelectionTool {

    constructor() {
        super("rectangleSelectTool");
    }

    onActivate() {
        this.setCursor();

        super.onActivate();
    }

}