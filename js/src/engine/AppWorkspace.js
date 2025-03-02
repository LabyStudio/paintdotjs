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
        this.activeDocumentWorkspace = documentWorkspace;
        this.updateTitle();
        this.updateCanvasBounds(false);

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

    onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, position) {
        // Handle mouse down for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseDown(mouseX, mouseY, button, position)) {
                return true;
            }
        }
        return super.onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, position);
    }

    onDocumentMouseMove(mouseX, mouseY, documentWorkspace, position) {
        // Handle mouse move for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseMove(mouseX, mouseY, position)) {
                return true;
            }
        }
        return super.onDocumentMouseMove(mouseX, mouseY, documentWorkspace, position);
    }

    onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, position) {
        // Handle mouse up for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseUp(mouseX, mouseY, button, position)) {
                return true;
            }
        }
        return super.onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, position);
    }

    setActiveTool(tool) {
        if (this.activeTool !== null) {
            this.activeTool.onDeactivate();
        }
        this.activeTool = tool;
        if (tool !== null) {
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