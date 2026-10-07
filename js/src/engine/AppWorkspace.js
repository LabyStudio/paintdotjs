class AppWorkspace extends AppView {

    constructor() {
        super();

        this.documentWorkspaces = [];
        this.activeDocumentWorkspace = null;
        this.activeTool = null;
        this.previousToolType = null;
        this.measurementUnit = "pixel";
        this.measurementNumberFormatter = new Intl.NumberFormat(Language.code, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    initialize() {
        try {
            ActionRegistry.initialize();
            PanelRegistry.initialize();
            FormRegistry.initialize();

            super.initialize();
        } catch (e) {
            this.handleError(e);
        }
    }

    createBlankDocumentInNewWorkspace(width, height, resolution = 96) {
        // Create document workspace
        let documentWorkspace = new DocumentWorkspace(this);

        // Create document with initial size
        let document = new Document(width, height, resolution);
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
        documentWorkspace.setDirty(false);

        // Update title
        this.updateTitle();

        this.fire("app:create_document", documentWorkspace);

        return documentWorkspace;
    }

    closeDocumentWorkspace(documentWorkspace, confirmUnsaved = true) {
        if (documentWorkspace === null || !this.documentWorkspaces.includes(documentWorkspace)) {
            return false;
        }
        if (confirmUnsaved && documentWorkspace.isDirty()
            && !window.confirm("Close \"" + documentWorkspace.getFriendlyName() + "\" without saving your changes?")) {
            return false;
        }

        const index = this.documentWorkspaces.indexOf(documentWorkspace);
        const wasActive = this.activeDocumentWorkspace === documentWorkspace;
        this.documentWorkspaces.splice(index, 1);
        if (wasActive) {
            const next = this.documentWorkspaces[Math.min(index, this.documentWorkspaces.length - 1)] || null;
            this.setActiveDocumentWorkspace(next);
        }
        this.fire("app:close_document", documentWorkspace);
        this.updateTitle();
        return true;
    }

    hasUnsavedDocuments() {
        return this.documentWorkspaces.some(workspace => workspace.isDirty());
    }

    setActiveDocumentWorkspace(documentWorkspace) {
        // Deactivate previous active tool using the previous active document workspace
        if (this.activeTool !== null && this.activeTool.isActive()) {
            this.activeTool.onDeactivate();
        }

        this.activeDocumentWorkspace = documentWorkspace;
        this.syncRulerVisibility();
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

        // Paint.NET treats Escape as a contextual cancel first. If the active
        // tool had nothing pending to cancel, it removes the current selection.
        if (key === "Escape"
            && !this.isControlKeyDown()
            && !this.isShiftKeyDown()
            && !this.isAltKeyDown()
            && !documentWorkspace.getSelection().isEmpty()) {
            documentWorkspace.executeFunction(new DeselectFunction());
            return true;
        }

        return super.onDocumentKeyPress(key, documentWorkspace);
    }

    onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, input = null) {
        // Handle mouse down for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseDown(mouseX, mouseY, button, input)) {
                return true;
            }
        }
        return super.onDocumentMouseDown(mouseX, mouseY, button, documentWorkspace, input);
    }

    onDocumentMouseMove(mouseX, mouseY, documentWorkspace, input = null) {
        // Handle mouse move for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseMove(mouseX, mouseY, input)) {
                return true;
            }
        }
        return super.onDocumentMouseMove(mouseX, mouseY, documentWorkspace, input);
    }

    onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, input = null) {
        // Handle mouse up for active tool
        if (this.activeTool !== null) {
            if (this.activeTool.onMouseUp(mouseX, mouseY, button, input)) {
                return true;
            }
        }
        return super.onDocumentMouseUp(mouseX, mouseY, button, documentWorkspace, input);
    }

    setActiveTool(tool) {
        if (this.activeTool !== null && tool !== null
            && this.activeTool.getType() !== tool.getType()) {
            this.previousToolType = this.activeTool.getType();
        }
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

    getPreviousToolType() {
        return this.previousToolType;
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
        if (this.measurementUnit === "pixel") return pixels;

        const documentModel = this.activeDocumentWorkspace?.getDocument();
        const value = documentModel === undefined || documentModel === null
            ? pixels
            : documentModel.pixelToPhysical(pixels, this.measurementUnit);
        return this.measurementNumberFormatter.format(value);
    }

}
