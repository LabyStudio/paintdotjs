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

class SettingsPluginsEntry extends SettingsEntry {

    render() {
        this.addHeading("Plugins", "Browse maintained JavaScript plugins or install a local file.");
        this.addNote("Plugins run code with access to this app. Only install plugins you trust.");

        // Plugin actions
        const controls = document.createElement("div");
        controls.className = "settings-plugin-controls";
        {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".paintjs,application/zip";
            input.multiple = true;
            input.hidden = true;
            input.onchange = async () => {
                if (input.files !== null && input.files.length > 0) {
                    await this.importPluginFiles(Array.from(input.files));
                }
                input.value = "";
            };
            controls.appendChild(input);

            const add = document.createElement("button");
            add.type = "button";
            add.className = "settings-action-button";
            add.textContent = "Install plugin…";
            add.onclick = () => input.click();
            controls.appendChild(add);

            let browse = document.createElement("button");
            browse.type = "button";
            browse.className = "settings-action-button";
            browse.textContent = "Browse plugins…";
            browse.onclick = () => PluginBrowserDialog.open();
            controls.appendChild(browse);
        }
        this.page.appendChild(controls);

        // Drop zone
        const dropZone = document.createElement("div");
        dropZone.className = "settings-font-drop-zone settings-plugin-drop-zone";
        dropZone.tabIndex = 0;
        dropZone.textContent = "Drop .paintjs plugin packages here";
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
            const files = Array.from(event.dataTransfer?.files || []);
            if (files.length > 0) {
                await this.importPluginFiles(files);
            }
        };
        this.page.appendChild(dropZone);

        const documentation = this.addNote("");
        documentation.classList.add("settings-asset-documentation");
        {
            const link = document.createElement("a");
            link.href = "https://github.com/LabyStudio/paintdotjs/tree/develop/docs/plugin-api";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Learn how to create a paint.js plugin";
            documentation.appendChild(link);
        }

        this.addSectionHeading("Installed plugins");
        this.pluginList = document.createElement("div");
        this.pluginList.className = "settings-plugin-list";
        this.page.appendChild(this.pluginList);
        this.renderPluginRows();
    }

    async importPlugin(file) {
        await this.importPluginFiles([file]);
    }

    async importPluginFiles(files) {
        if (this.pluginImporting) {
            this.setStatus("Wait for the current plugin import to finish.");
            return;
        }
        this.pluginImporting = true;
        this.pluginImportResults = [];
        let installedCount = 0;
        let failedCount = 0;
        let lastInstalledId = null;
        for (let file of files) {
            this.setStatus(`Inspecting ${file.name}…`);
            try {
                const plugin = await PluginManager.importFile(file);
                this.pluginImportResults.push({
                    fileName: file.name,
                    family: "paint.js plugin package",
                    status: "installed",
                    reason: `Installed ${plugin.name}.`,
                    warnings: []
                });
                lastInstalledId = plugin.id;
                ++installedCount;
            } catch (error) {
                console.error(`Could not import ${file.name}`, error);
                this.pluginImportResults.push({
                    fileName: file.name,
                    family: "Plugin package",
                    status: "invalid",
                    reason: error.message,
                    warnings: []
                });
                ++failedCount;
            }
        }
        this.pluginImporting = false;
        this.renderPluginRows(lastInstalledId);
        const installedLabel = installedCount === 1 ? "plugin" : "plugins";
        const failureLabel = failedCount === 1 ? "file could" : "files could";
        const failureText = failedCount > 0 ? ` ${failedCount} ${failureLabel} not be installed.` : "";
        this.setStatus(`Installed ${installedCount} ${installedLabel}.${failureText}`);
        if (this.getPluginIssues().length > 0) {
            void this.showPluginIssuesPopup();
        }
    }

    getPluginIssues() {
        return this.pluginImportResults.filter(result =>
            result.status !== "installed"
            || (result.warnings || []).length > 0
        );
    }

    createPluginIssueRow(result) {
        const row = document.createElement("article");
        row.className = `settings-plugin-import-result settings-plugin-import-${result.status}`;
        {
            const name = document.createElement("strong");
            name.textContent = result.fileName;
            row.appendChild(name);

            const status = document.createElement("span");
            const labels = {installed: "Installed", invalid: "Error"};
            status.className = "settings-plugin-import-status";
            status.textContent = labels[result.status] || result.status;
            row.appendChild(status);

            const details = document.createElement("span");
            details.className = "settings-plugin-import-details";
            details.textContent = `${result.family}: ${result.reason}`;
            row.appendChild(details);

            for (const warningText of result.warnings || []) {
                const warning = document.createElement("span");
                warning.className = "settings-plugin-import-warning";
                warning.textContent = warningText;
                row.appendChild(warning);
            }
        }
        return row;
    }

    async showPluginIssuesPopup() {
        const issues = this.getPluginIssues();
        if (issues.length === 0) {
            return;
        }
        const list = document.createElement("div");
        list.className = "settings-plugin-import-list plugin-issues-list";
        for (const issue of issues) {
            list.appendChild(this.createPluginIssueRow(issue));
        }
        const issueLabel = issues.length === 1 ? "issue" : "issues";
        await TaskDialog.show({
            title: "Plugin warnings and errors",
            icon: "assets/icons/settings_plugins_24.png",
            className: "plugin-issues-dialog",
            message: `${issues.length} plugin ${issueLabel} found.`,
            preview: list,
            cancelValue: "close",
            choices: [{
                value: "close",
                title: "Close",
                description: "Return to plugin settings.",
                icon: "assets/icons/cancel_icon.png"
            }]
        });
    }

    renderPluginRows(scrollToId = null) {
        if (this.pluginList === null || !this.pluginList.isConnected) {
            return;
        }
        this.pluginList.innerHTML = "";
        const plugins = PluginManager.getPlugins();
        if (plugins.length === 0) {
            const empty = document.createElement("div");
            empty.className = "settings-empty-list settings-plugin-empty";
            empty.textContent = "No plugins are installed.";
            this.pluginList.appendChild(empty);
            return;
        }
        for (const plugin of plugins) {
            const row = document.createElement("article");
            row.className = "settings-plugin-row";
            {
                // Details
                const details = document.createElement("div");
                details.className = "settings-plugin-details";
                {
                    const name = document.createElement("strong");
                    name.textContent = plugin.name;
                    details.appendChild(name);

                    const metadata = document.createElement("span");
                    const author = plugin.author ? ` by ${plugin.author}` : "";
                    const effectLabel = plugin.effectCount === 1 ? "effect" : "effects";
                    let capabilities = [];
                    if (plugin.effectCount) {
                        capabilities.push(`${plugin.effectCount} ${effectLabel}`);
                    }
                    if (plugin.fileTypeCount) {
                        capabilities.push(`${plugin.fileTypeCount} file ${plugin.fileTypeCount === 1 ? "type" : "types"}`);
                    }
                    metadata.textContent = `${plugin.version}${author} · ${capabilities.join(", ")}`;
                    details.appendChild(metadata);

                    if (plugin.description) {
                        const description = document.createElement("span");
                        description.textContent = plugin.description;
                        details.appendChild(description);
                    }
                }
                row.appendChild(details);

                // Enabled toggle
                const enabledLabel = document.createElement("label");
                enabledLabel.className = "settings-plugin-enabled";
                {
                    const enabled = document.createElement("input");
                    enabled.type = "checkbox";
                    enabled.checked = plugin.enabled;
                    enabled.onchange = async () => {
                        enabled.disabled = true;
                        try {
                            await PluginManager.setEnabled(plugin.id, enabled.checked);
                            this.setStatus(`${plugin.name} ${enabled.checked ? "enabled" : "disabled"}.`);
                        } catch (error) {
                            enabled.checked = !enabled.checked;
                            ErrorForm.report(error, `Could not update ${plugin.name}`);
                        } finally {
                            enabled.disabled = false;
                        }
                    };
                    enabledLabel.appendChild(enabled);

                    const enabledText = document.createElement("span");
                    enabledText.textContent = "Enabled";
                    enabledLabel.appendChild(enabledText);
                }
                row.appendChild(enabledLabel);

                // Remove button
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "settings-font-remove settings-plugin-remove";
                remove.title = `Remove ${plugin.name}`;
                remove.setAttribute("aria-label", `Remove ${plugin.name}`);
                remove.onclick = async () => {
                    await PluginManager.remove(plugin.id);
                    this.setStatus(`Removed ${plugin.name}.`);
                    this.renderPluginRows();
                };
                {
                    const icon = document.createElement("img");
                    icon.src = "assets/icons/cancel_icon.png";
                    icon.alt = "";
                    remove.appendChild(icon);
                }
                row.appendChild(remove);
            }
            this.pluginList.appendChild(row);
            if (plugin.id === scrollToId) {
                this.scrollToAddedRow(row);
            }
        }
    }
}
