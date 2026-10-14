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

class ToolInfoItem extends LabelMenuItem {

    constructor() {
        super("toolInfoItem");

        this.showSelection = false;

        this.app.on("app:active_tool_updated", tool => {
            // Legacy tools activate with their help text. Move and Magic Wand
            // restore the latest selection status in their OnGetStatus override.
            this.showSelection = tool instanceof MoveToolBase || tool instanceof MagicWandTool;
            this.reinitialize();
        });

        this.app.on("document:selection_changed", documentWorkspace => {
            if (documentWorkspace === this.app.getActiveDocumentWorkspace()) {
                this.showSelection = true;
                this.updateStatus();
            }
        });

        this.app.on("app:update_active_document", () => {
            this.updateStatus();
        });

        this.app.on("document:update_size", () => {
            this.updateStatus();
        });

        this.app.on("document:history_changed", workspace => {
            if (workspace === this.app.getActiveDocumentWorkspace()) {
                this.updateStatus();
            }
        });

        this.app.on("app:update_measurement_unit", () => {
            this.showSelection = true;
            this.updateStatus();
        });
    }

    updateStatus() {
        this.updateText();
        if (this.element !== null) {
            let icon = this.element.querySelector(".icon");
            if (icon !== null) {
                let source = "assets/icons/" + this.getIconPath();
                if (icon.getAttribute("src") !== source) {
                    icon.src = source;
                }
            }
        }
    }

    hasSelection() {
        let workspace = this.app.getActiveDocumentWorkspace();
        return this.showSelection && workspace !== null && !workspace.getSelection().isEmpty();
    }

    getSelectedTool() {
        let selector = PanelRegistry.get("toolMenu").get("toolStripChooser.chooseToolButton");
        return selector.getSelectedEntry();
    }

    getIconPath() {
        return this.hasSelection() ? "selection_icon.png" : this.getSelectedTool().getIconPath();
    }

    getText() {
        if (this.app.getActiveDocumentWorkspace() === null || this.app.getActiveTool() === null) {
            return "";
        }
        if (this.hasSelection()) {
            return this.getSelectionText();
        }

        let selectedTool = this.getSelectedTool();
        let helpText = i18n(selectedTool.id + ".helpText");
        if (typeof helpText !== "string") {
            helpText = i18n(selectedTool.id + ".helpText.text");
        }
        return i18n("statusBar.context.help.text.format", [i18n(selectedTool.getText()), helpText]);
    }

    getSelectionText() {
        let workspace = this.app.getActiveDocumentWorkspace();
        let documentModel = workspace.getDocument();
        let {bounds, area} = workspace.getSelection().getStatistics(documentModel.getBounds());
        let unit = this.app.getMeasurementUnit();
        let isPixel = unit === "pixel";
        let locale = navigator.language;
        let coordinates = new Intl.NumberFormat(locale, {
            useGrouping: false,
            minimumFractionDigits: isPixel ? 0 : 2,
            maximumFractionDigits: isPixel ? 0 : 2,
            roundingMode: "halfEven"
        });
        let numbers = new Intl.NumberFormat(locale, {
            minimumFractionDigits: isPixel ? 0 : 2,
            maximumFractionDigits: isPixel ? 0 : 2,
            roundingMode: "halfEven"
        });
        let formatCoordinate = value => coordinates.format(documentModel.pixelToPhysical(value, unit));
        let abbreviation = isPixel ? "" : i18n("measurementUnit." + unit + ".abbreviation");
        let pixelSize = documentModel.pixelToPhysical(1, unit);
        let values = [
            formatCoordinate(bounds.x), abbreviation,
            formatCoordinate(bounds.y), abbreviation,
            formatCoordinate(bounds.width), abbreviation,
            formatCoordinate(bounds.height), abbreviation,
            numbers.format(area * pixelSize * pixelSize),
            i18n("measurementUnit." + unit + ".plural").toLocaleLowerCase(locale)
        ];
        let format = "statusBar.context.selectedArea.text.format";
        let tool = this.app.getActiveTool();
        if (tool instanceof MoveToolBase && tool.context !== null
            && tool.context.lifted && tool.context.deltaTransform !== null) {
            let transform = tool.context.deltaTransform;
            let rotation = Utility.getAngleOfTransform(transform);
            let flipped = Utility.isTransformFlipped(transform);
            if ((!flipped && Math.abs(rotation) > 0.0001)
                || (flipped && Math.abs(rotation - 180) > 0.0001)
                || tool.context.currentMode === MoveToolBaseMode.ROTATE) {
                let angle = -rotation;
                while (angle > 180) {
                    angle -= 360;
                }
                while (angle < -180) {
                    angle += 360;
                }
                values.push(new Intl.NumberFormat(locale, {
                    minimumFractionDigits: 2, maximumFractionDigits: 2, roundingMode: "halfEven"
                }).format(angle === 0 ? 0 : angle));
                format = "statusBar.context.selectedArea.text.withAngle.format";
            }
        }
        return i18n(format, values);
    }

}
