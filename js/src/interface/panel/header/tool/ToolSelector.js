class ToolSelector extends SelectorMenuItem {

    constructor() {
        super("toolStripChooser.chooseToolButton");

        let toolIds = [
            "rectangleSelectTool",
            "moveTool",
            "lassoSelectTool",
            "moveSelectionTool",
            "ellipseSelectTool",
            "zoomTool",
            "magicWandTool",
            "panTool",
            "paintBucketTool",
            "gradientTool",
            "paintBrushTool",
            "eraserTool",
            "pencilTool",
            "colorPickerTool",
            "cloneStampTool",
            "recolorTool",
            "textTool",
            "lineTool",
            "shapesTool"
        ]

        // Add the tools to the drop menu
        for (let id of toolIds) {
            let entry = new DropEntry(id, () => {
                this.setSelectedId(id);
            }).withTranslationKey("name", false);

            // Fix the icon path of the paint bucket and recolor tools
            if (id === "paintBucketTool") {
                entry.withIconPathKey("paint_bucket_icon");
            }
            if (id === "recolorTool") {
                entry.withIconPathKey("recoloring_tool_icon");
            }

            this.add(entry);
        }

        // this.setSelectedId("paintBrushTool")
        this.setSelectedId("panTool")
    }

    setSelectedId(id) {
        super.setSelectedId(id);

        let tool = ToolRegistry.get(id);
        this.app.setActiveTool(tool);
    }
}