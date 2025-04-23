class AppWorkspace extends AppView {

    constructor() {
        super();

        this.documentWorkspaces = [];
        this.activeDocumentWorkspace = null;
        this.activeTool = null;
        this.measurementUnit = "pixel";
    }

    initialize() {
        ActionRegistry.initialize();
        PanelRegistry.initialize();
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
        let backgroundLayer = Layer.createBackgroundLayer(documentWorkspace, width, height);
        document.addLayer(backgroundLayer);
        documentWorkspace.setActiveLayer(backgroundLayer);

        // TODO improve invalidating?
        document.invalidate();

        // Add document workspace to list
        this.documentWorkspaces.push(documentWorkspace);

        // Set active document workspace
        this.setActiveDocumentWorkspace(documentWorkspace);

        let history = documentWorkspace.getHistory();
        history.clearAll();
        history.pushNewMemento(new NullHistoryMemento(
            i18n("newImageAction.name"),
            "assets/icons/menu_file_new_icon.png"
        ));

        // Update title
        this.updateTitle();

        this.fire("app:create_document", documentWorkspace);

        return documentWorkspace;
    }

    setActiveDocumentWorkspace(documentWorkspace) {
        // Deactivate previous active tool using the previous active document workspace
        if (this.activeTool !== null && this.activeTool.isActive()) {
            this.activeTool.onDeactivate();
        }

        this.activeDocumentWorkspace = documentWorkspace;
        this.updateTitle();
        this.updateCanvasBounds(false);

        // Update active tool
        this.setActiveTool(this.getActiveTool());

        this.fire("document:update_viewport", documentWorkspace);
        this.fire("app:update_active_document", documentWorkspace);
    }

    performAction(action) {
        action.performAction(this);
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

    onDocumentKeyPress(key, documentWorkspace) {
        // Handle key press for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onKeyPress(key)) {
                return true;
            }
        }
        return super.onDocumentMouseDown(key, documentWorkspace);
    }

    onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace) {
        // Handle mouse down for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseDown(mouseX, mouseY, button)) {
                return true;
            }
        }
        return super.onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace);
    }

    onDocumentMouseMove(mouseX, mouseY, documentWorkspace) {
        // Handle mouse move for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseMove(mouseX, mouseY)) {
                return true;
            }
        }
        return super.onDocumentMouseMove(mouseX, mouseY, documentWorkspace);
    }

    onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace) {
        // Handle mouse up for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseUp(mouseX, mouseY, button)) {
                return true;
            }
        }
        return super.onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace);
    }

    setActiveTool(tool) {
        if (this.activeTool !== null && this.activeTool.isActive()) {
            this.activeTool.onDeactivate();
        }
        this.activeTool = tool;
        if (tool !== null && this.activeDocumentWorkspace != null) {
            tool.onActivate();
        }
        this.fire("app:active_tool_updated", tool);
    }

    setActiveToolFromType(type) {
        let tool = type.create();
        this.setActiveTool(tool);
    }

    getActiveTool() {
        return this.activeTool;
    }

    getActiveDocumentWorkspace() {
        return this.activeDocumentWorkspace;
    }

    getDocumentWorkspaces() {
        return this.documentWorkspaces;
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