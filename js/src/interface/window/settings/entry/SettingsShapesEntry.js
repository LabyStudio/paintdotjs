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

class SettingsShapesEntry extends SettingsEntry {

    render() {
        this.addHeading("Shapes", "Add Paint.NET XAML shapes to the Custom group in the Shapes tool.");
        this.addNote("Shape files are stored locally in this app and are not uploaded.");

        // Shape actions
        const controls = document.createElement("div");
        controls.className = "settings-shape-controls";
        {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".xaml,application/xml,text/xml";
            input.multiple = true;
            input.hidden = true;
            input.onchange = async () => {
                await this.importShapes(Array.from(input.files || []));
                input.value = "";
            };
            controls.appendChild(input);

            this.shapeAddButton = document.createElement("button");
            this.shapeAddButton.type = "button";
            this.shapeAddButton.className = "settings-action-button";
            this.shapeAddButton.textContent = "Add shapes…";
            this.shapeAddButton.onclick = () => input.click();
            controls.appendChild(this.shapeAddButton);

            this.shapeIssuesButton = document.createElement("button");
            this.shapeIssuesButton.type = "button";
            this.shapeIssuesButton.className = "settings-action-button";
            this.shapeIssuesButton.onclick = () => this.showShapeIssuesPopup();
            controls.appendChild(this.shapeIssuesButton);

            this.shapeClearButton = document.createElement("button");
            this.shapeClearButton.type = "button";
            this.shapeClearButton.className = "settings-action-button settings-shape-clear";
            this.shapeClearButton.textContent = "Clear all";
            this.shapeClearButton.onclick = () => this.clearAllShapes();
            controls.appendChild(this.shapeClearButton);
        }
        this.page.appendChild(controls);

        // Drop zone
        const dropZone = document.createElement("div");
        dropZone.className = "settings-font-drop-zone settings-shape-drop-zone";
        dropZone.tabIndex = 0;
        dropZone.textContent = "Drop Paint.NET .xaml shape files here";
        dropZone.ondragenter = dropZone.ondragover = event => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add("drag-over");
            if (event.dataTransfer !== null) {
                event.dataTransfer.dropEffect = "copy";
            }
        };
        dropZone.ondragleave = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!dropZone.contains(event.relatedTarget)) {
                dropZone.classList.remove("drag-over");
            }
        };
        dropZone.ondrop = async event => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove("drag-over");
            await this.importShapes(Array.from(event.dataTransfer?.files || []));
        };
        this.shapeDropZone = dropZone;
        this.page.appendChild(dropZone);

        this.updateShapeControls();

        // Installed shapes
        this.addSectionHeading("Installed shapes");
        this.shapeList = document.createElement("div");
        this.shapeList.className = "settings-shape-list";
        this.page.appendChild(this.shapeList);
        this.renderShapeRows();
    }

    async importShapes(files) {
        const shapeFiles = files.filter(file => ShapeManager.isShapeFile(file));
        if (shapeFiles.length === 0) {
            this.setStatus("Choose one or more Paint.NET .xaml shape files.");
            return null;
        }
        if (this.shapeImporting) {
            this.setStatus("Wait for the current shape import to finish.");
            return null;
        }

        this.shapeImporting = true;
        this.updateShapeControls();
        this.setStatus(`Adding ${shapeFiles.length} shape${shapeFiles.length === 1 ? "" : "s"}…`);
        try {
            const result = await ShapeManager.importFiles(shapeFiles);
            this.shapeImportResults = result.errors.map(item => ({
                fileName: item.file.name,
                message: item.error.message
            }));
            const errorText = result.errors.length === 0
                ? "" : ` ${result.errors.length} could not be added.`;
            this.setStatus(`Added ${result.added.length} shape${result.added.length === 1 ? "" : "s"}.${errorText}`);
            const addedShape = result.added[result.added.length - 1] || null;
            this.renderShapeRows(addedShape?.id || null);
            this.updateShapeControls();
            if (this.getShapeIssues().length > 0) {
                void this.showShapeIssuesPopup();
            }
            return result;
        } finally {
            this.shapeImporting = false;
            this.updateShapeControls();
        }
    }

    getShapeIssues() {
        return [...this.shapeImportResults, ...ShapeManager.getLoadErrors()];
    }

    updateShapeControls() {
        const shapes = ShapeManager.getShapes();
        if (this.shapeAddButton !== null) {
            this.shapeAddButton.disabled = this.shapeImporting;
        }
        if (this.shapeClearButton !== null) {
            this.shapeClearButton.disabled = this.shapeImporting || shapes.length === 0;
        }
        if (this.shapeDropZone !== null) {
            this.shapeDropZone.classList.toggle("busy", this.shapeImporting);
            this.shapeDropZone.setAttribute("aria-busy", String(this.shapeImporting));
        }
        if (this.shapeIssuesButton !== null) {
            const count = this.getShapeIssues().length;
            this.shapeIssuesButton.hidden = count === 0;
            this.shapeIssuesButton.textContent = `View errors… (${count})`;
        }
    }

    renderShapeRows(scrollToId = null) {
        if (this.shapeList === null || !this.shapeList.isConnected) {
            return;
        }
        this.shapeList.innerHTML = "";
        const shapes = ShapeManager.getShapes();
        this.updateShapeControls();
        if (shapes.length === 0) {
            const empty = document.createElement("div");
            empty.className = "settings-empty-list settings-shape-empty";
            empty.textContent = "No custom shapes have been added.";
            this.shapeList.appendChild(empty);
            return;
        }

        for (const shape of shapes) {
            const row = document.createElement("article");
            row.className = "settings-shape-row";
            {
                // Preview
                const preview = document.createElement("img");
                preview.className = "settings-shape-preview";
                preview.src = shape.loaded
                    ? ShapeCatalog.getIconSource(shape.shapeId) : "assets/icons/warning_icon.png";
                preview.alt = "";
                row.appendChild(preview);

                // Shape details
                const details = document.createElement("div");
                details.className = "settings-shape-details";
                {
                    const name = document.createElement("strong");
                    name.textContent = shape.name;
                    details.appendChild(name);

                    const metadata = document.createElement("span");
                    metadata.textContent = `${shape.fileName} · ${this.formatFileSize(shape.size)}`;
                    details.appendChild(metadata);
                }
                row.appendChild(details);

                // Remove action
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "settings-shape-remove";
                remove.title = `Remove ${shape.name}`;
                remove.setAttribute("aria-label", `Remove ${shape.name}`);
                {
                    const icon = document.createElement("img");
                    icon.src = "assets/icons/cancel_icon.png";
                    icon.alt = "";
                    remove.appendChild(icon);
                }
                remove.onclick = async () => {
                    remove.disabled = true;
                    await ShapeManager.remove(shape.id);
                    this.setStatus(`Removed ${shape.name}.`);
                    this.renderShapeRows();
                };
                row.appendChild(remove);
            }
            this.shapeList.appendChild(row);
            if (shape.id === scrollToId) {
                this.scrollToAddedRow(row);
            }
        }
    }

    async showShapeIssuesPopup() {
        const issues = this.getShapeIssues();
        if (issues.length === 0) {
            return;
        }

        const list = document.createElement("div");
        list.className = "settings-shape-error-list";
        for (const issue of issues) {
            const row = document.createElement("article");
            row.className = "settings-shape-error";
            {
                const name = document.createElement("strong");
                name.textContent = issue.fileName;
                row.appendChild(name);

                const message = document.createElement("span");
                message.textContent = issue.message;
                row.appendChild(message);
            }
            list.appendChild(row);
        }

        await TaskDialog.show({
            title: "Shape errors",
            icon: "assets/icons/warning_icon.png",
            className: "shape-errors-dialog",
            message: `${issues.length} shape file${issues.length === 1 ? "" : "s"} could not be loaded.`,
            preview: list,
            cancelValue: "close",
            choices: [{
                value: "close",
                title: "Close",
                description: "Return to shape settings.",
                icon: "assets/icons/cancel_icon.png"
            }]
        });
    }

    async clearAllShapes() {
        const count = ShapeManager.getShapes().length;
        if (count === 0) {
            return;
        }
        const choice = await TaskDialog.show({
            title: "Clear Custom Shapes",
            icon: "assets/icons/warning_icon.png",
            message: `Remove all ${count} custom shapes from paint.js? This cannot be undone.`,
            cancelValue: "cancel",
            choices: [
                {
                    value: "clear",
                    title: "Clear All Shapes",
                    description: "Delete every custom shape stored by paint.js.",
                    icon: "assets/icons/trash_can.png"
                },
                {
                    value: "cancel",
                    title: "Cancel",
                    description: "Keep the installed shapes.",
                    icon: "assets/icons/cancel_icon.png"
                }
            ]
        });
        if (choice !== "clear") {
            return;
        }

        await ShapeManager.clear();
        this.shapeImportResults = [];
        this.setStatus(`Removed ${count} custom shapes.`);
        this.renderShapeRows();
    }

    formatFileSize(size) {
        return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
    }
}
