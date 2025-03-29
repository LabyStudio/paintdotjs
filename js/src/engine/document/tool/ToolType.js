class ToolType {

    static PAN = new ToolType(
        "panTool",
        "pan_tool_icon",
        type => new PanTool(type)
    );
    static RECTANGLE_SELECT = new ToolType(
        "rectangleSelectTool",
        "rectangle_select_tool",
        type => new RectangleSelectTool(type)
    );
    static LASSO_SELECT = new ToolType(
        "lassoSelectTool",
        "lasso_select_tool",
        type => new LassoSelectTool(type)
    );
    static ELLIPSE_SELECT = new ToolType(
        "ellipseSelectTool",
        "ellipse_select_tool",
        type => new EllipseSelectTool(type)
    );
    static MOVE_SELECTION = new ToolType(
        "moveSelectionTool",
        "move_selection_tool",
        type => new MoveSelectionTool(type)
    );

    static VALUES = [
        ToolType.PAN,
        ToolType.RECTANGLE_SELECT,
        ToolType.LASSO_SELECT,
        ToolType.ELLIPSE_SELECT,
        ToolType.MOVE_SELECTION
    ];

    constructor(id, iconName, factory) {
        this.id = id;
        this.iconName = iconName;
        this.factory = factory;
    }

    create() {
        return this.factory(this);
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