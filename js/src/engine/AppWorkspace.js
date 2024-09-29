class AppWorkspace extends AppView {

    constructor() {
        super();

        this.documentWorkspaces = [];
        this.activeDocumentWorkspace = null;
        this.activeTool = null;
        this.measurementUnit = "pixel";
    }

    initialize() {
        PanelRegistry.initialize();
        ToolRegistry.initialize();
        FormRegistry.initialize();

        super.initialize();
    }

    createBlankDocumentInNewWorkspace(width, height) {
        // Create document workspace
        let documentWorkspace = new DocumentWorkspace(this);

        // Create document with initial size
        let document = new Document(width, height);
        documentWorkspace.setDocument(document);
        documentWorkspace.fitViewport();

        // Add default background layer
        let backgroundLayer = Layer.createBackgroundLayer(this, width, height);
        document.addLayer(backgroundLayer);
        documentWorkspace.setActiveLayer(backgroundLayer);

        // TODO improve invalidating?
        document.invalidate();

        // Add document workspace to list
        this.documentWorkspaces.push(documentWorkspace);

        // Set active document workspace
        if (this.activeDocumentWorkspace == null || this.documentWorkspaces.length === 0) {
            this.setActiveDocumentWorkspace(documentWorkspace);
        }

        // Update title
        this.updateTitle();

        return documentWorkspace;
    }

    setActiveDocumentWorkspace(documentWorkspace) {
        this.activeDocumentWorkspace = documentWorkspace;
        this.updateTitle();

        this.fire("app:update_active_document", documentWorkspace);
    }

    updateTitle() {
        if (this.activeDocumentWorkspace === null) {
            setTitle(PdjInfo.productName());
        } else {
            let name = this.activeDocumentWorkspace.getFriendlyName();

            let title = i18n("mainForm.title.format")
                .replace("{0}", name)
                .replace("{1}", PdjInfo.productName() + " " + PdjInfo.version() + " " + (isApp ? "App" : "Web"));
            setTitle(title);
        }
    }

    onMouseDown(mouseX, mouseY, button) {
        // Handle mouse down for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseDown(mouseX, mouseY, button)) {
                return true;
            }
        }

        if (super.onMouseDown(mouseX, mouseY, button)) {
            return true;
        }

        return false;
    }

    onMouseMove(mouseX, mouseY) {
        // Handle mouse move for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseMove(mouseX, mouseY)) {
                return true;
            }
        }

        if (super.onMouseMove(mouseX, mouseY)) {
            return true;
        }

        return false;
    }

    onMouseUp(mouseX, mouseY, button) {
        // Handle mouse up for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseUp(mouseX, mouseY, button)) {
                return true;
            }
        }

        if (super.onMouseUp(mouseX, mouseY, button)) {
            return true;
        }

        return false;
    }

    setActiveTool(tool) {
        this.activeTool = tool;
        if (tool !== null) {
            tool.onActivate();
        }
        this.fire("app:active_tool_updated", tool);
    }

    setActiveToolFromId(id) {
        let tool = ToolRegistry.get(id);
        if (tool === null) {
            throw new Error("Tool not found: " + id);
        }
        this.setActiveTool(tool);
    }

    getActiveTool() {
        return this.activeTool;
    }

    getActiveDocumentWorkspace() {
        return this.activeDocumentWorkspace;
    }

    setMeasurementUnit(unit) {
        this.measurementUnit = unit;
        this.fire("app:update_measurement_unit", unit);
    }

    getMeasurementUnit() {
        return this.measurementUnit;
    }

    toUnit(pixels) {
        if (this.measurementUnit === "inch") {
            return (pixels / 96).toFixed(2).replace(".", ",");
        } else if (this.measurementUnit === "centimeter") {
            return (pixels / 96 * 2.54).toFixed(2).replace(".", ",");
        }
        return pixels;
    }

}