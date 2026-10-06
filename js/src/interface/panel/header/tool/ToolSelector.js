class ToolSelector extends SelectorMenuItem {

    constructor() {
        super("toolStripChooser.chooseToolButton");

        let toolIds = ToolType.VALUES.map(toolType => toolType.getId());

        // Add the tools to the drop menu
        for (let id of toolIds) {
            let implemented = ToolType.getById(id) !== null;

            let entry = new DropEntry(id, () => {
                if (implemented) {
                    this.setSelectedId(id);
                }
            }).withTranslationKey("name", false);
            entry.setEnabled(implemented);

            // Fix the icon path of the paint bucket and recolor tools
            if (id === "paintBucketTool") {
                entry.withIconPathKey("paint_bucket_icon");
            }
            if (id === "recolorTool") {
                entry.withIconPathKey("recoloring_tool_icon");
            }
            // The compact toolbar and dropdown use Paint.NET's square tool
            // glyph. The Tools window deliberately keeps the wider artwork.
            if (id === "shapesTool") {
                entry.withIconPathKey("shapes_tool_icon_16");
            }

            this.add(entry);
        }

        this.setSelectedId("paintBrushTool")

        this.app.on("app:shortcut_changed", () => this.reinitialize());
    }

    buildElement() {
        const element = super.buildElement();
        const type = ToolType.getById(this.getSelectedId());
        if (type !== null) element.title = type.getTooltipText();
        return element;
    }

    setSelectedId(id) {
        super.setSelectedId(id);

        let tool = ToolType.getById(id);
        if (tool === null) {
            throw new Error("Tool not found: " + id);
        }
        this.app.setActiveToolFromType(tool);
    }
}
