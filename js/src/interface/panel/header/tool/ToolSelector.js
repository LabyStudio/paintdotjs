class ToolSelector extends DropMenuItem {

    constructor() {
        super("toolStripChooser.chooseToolButton");

        this.selected = "paintBrushTool";

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
                this.switchTool(id);
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
    }

    buildElement() {
        let selectedEntry = this.getSelectedEntry();

        let element = super.buildElement();
        element.className += " tool-selector";
        {
            // Icon
            let icon = document.createElement("img");
            icon.className = "icon";
            icon.src = "assets/icons/" + selectedEntry.getIconPath();
            element.appendChild(icon);

            // Separator
            let separator = document.createElement("div");
            separator.className = "separator";
            element.appendChild(separator);

            // Arrow down
            let arrowDown = document.createElement("div");
            arrowDown.className = "arrow-down";
            element.appendChild(arrowDown);
        }
        return element;
    }

    switchTool(id) {
        console.log("Switching to tool: " + id);
    }

    getSelectedId() {
        return this.selected;
    }

    getSelectedEntry() {
        for (let entry of this.entries) {
            if (entry.id === this.selected) {
                return entry;
            }
        }
        return null;
    }
}