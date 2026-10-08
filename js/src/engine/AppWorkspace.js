/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class AppWorkspace extends AppView {

    constructor() {
        super();

        this.documentWorkspaces = [];
        this.initialWorkspace = null;
        this.activeDocumentWorkspace = null;
        this.activeTool = null;
        this.previousToolType = null;
        const savedMeasurementUnit = typeof AppSettingsStore === "undefined"
            ? "pixel"
            : AppSettingsStore.get("workspace.measurementUnit", "pixel");
        this.measurementUnit = ["pixel", "inch", "centimeter"].includes(savedMeasurementUnit)
            ? savedMeasurementUnit
            : "pixel";
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

    createBlankDocumentInNewWorkspace(width, height, resolution = 96, isInitial = false) {
        const initialWorkspace = this.initialWorkspace
            || this.documentWorkspaces.find(candidate => candidate.isInitialWorkspace === true)
            || null;
        if (!isInitial && this.isInitialWorkspaceUntouched(initialWorkspace)) {
            this.closeDocumentWorkspace(initialWorkspace, false);
        }

        // Create document workspace
        let documentWorkspace = new DocumentWorkspace(this);
        documentWorkspace.isInitialWorkspace = isInitial;

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

        if (isInitial) {
            this.initialWorkspace = documentWorkspace;
        }

        return documentWorkspace;
    }

    isInitialWorkspaceUntouched(workspace = this.initialWorkspace) {
        if (workspace === null || !this.documentWorkspaces.includes(workspace)
            || workspace.isDirty()) {
            return false;
        }
        // A tool preview (notably editable text) has not reached history yet,
        // but it is still user work and must not be discarded as an untouched
        // startup image.
        if (workspace === this.activeDocumentWorkspace
            && this.activeTool?.bitmapTransaction !== null) {
            return false;
        }

        const history = workspace.getHistory();
        const undo = history.getUndoStack();
        const redo = history.getRedoStack();
        return redo.length === 0
            && (undo.length === 0
                || (undo.length === 1 && undo[0] instanceof NullHistoryMemento));
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
        if (this.initialWorkspace === documentWorkspace) {
            this.initialWorkspace = null;
        }
        documentWorkspace.isInitialWorkspace = false;
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
        if (documentWorkspace !== null) {
            documentWorkspace.setGridVisible(this.gridVisible);
            documentWorkspace.setRulersVisible(this.rulersVisible);
        }
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
        const appName = PdjInfo.productName() + " " + PdjInfo.version();
        if (this.activeDocumentWorkspace === null) {
            setTitle(appName);
        } else {
            const workspace = this.activeDocumentWorkspace;
            const name = workspace.getFriendlyName();

            let title = i18n("mainForm.title.format")
                .replace("{0}", name)
                .replace("{1}", appName);
            if (workspace.isDirty()) {
                title = "*" + title;
            }
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

    onModifierKeysChanged() {
        if (this.activeTool !== null) {
            this.activeTool.onModifierKeysChanged();
        }
        super.onModifierKeysChanged();
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
        if (!["pixel", "inch", "centimeter"].includes(unit)) {
            return;
        }
        this.measurementUnit = unit;
        if (typeof AppSettingsStore !== "undefined") {
            AppSettingsStore.set("workspace.measurementUnit", unit);
            if (unit !== "pixel") {
                AppSettingsStore.set("workspace.lastNonPixelUnit", unit);
            }
        }
        this.fire("app:update_measurement_unit", unit);
        this.fire("document:mousemove", this.getLastMouseX(), this.getLastMouseY());
    }

    getMeasurementUnit() {
        return this.measurementUnit;
    }

    toUnit(pixels) {
        if (this.measurementUnit === "pixel") {
            return pixels;
        }

        const documentModel = this.activeDocumentWorkspace?.getDocument();
        const value = documentModel === undefined || documentModel === null
            ? pixels
            : documentModel.pixelToPhysical(pixels, this.measurementUnit);
        return this.measurementNumberFormatter.format(value);
    }

}
