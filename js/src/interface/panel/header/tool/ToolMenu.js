class ToolMenu extends StripPanel {

    constructor() {
        super("toolMenu", {
            items: [
                new ToolSelector(),
                new HorizontalSeparator(),
            ]
        });
    }

}