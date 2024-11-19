class ToolType {

    static PAN = new ToolType(
        "panTool",
        "pan_tool_icon",
        () => new PanTool()
    );
    static RECTANGLE_SELECT = new ToolType(
        "rectangleSelectTool",
        "rectangle_select_tool",
        () => new RectangleSelectTool()
    );

    static VALUES = [
        ToolType.PAN,
        ToolType.RECTANGLE_SELECT
    ];

    constructor(id, iconName, factory) {
        this.id = id;
        this.iconName = iconName;
        this.factory = factory;
    }

    create() {
        return this.factory();
    }

    getIconName() {
        return this.iconName;
    }

    getName() {
        return i18n(this.id + ".name");
    }

    getIconSrc() {
        return "assets/icons/" + this.getIconName() + "_icon.png";
    }

    getId() {
        return this.id;
    }

    static getById(id) {
        for (let type of ToolType.VALUES) {
            if (type.id === id) {
                return type;
            }
        }
        return null;
    }
}