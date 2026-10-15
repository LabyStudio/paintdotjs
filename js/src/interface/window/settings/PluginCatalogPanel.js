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

class PluginCatalogPanel {

    constructor(parent, setStatus) {
        this.entries = [];
        this.setStatus = setStatus;
        this.busy = false;
        this.root = document.createElement("div");
        this.root.className = "settings-plugin-catalog";
        parent.appendChild(this.root);
        {
            // Search and refresh
            let actions = document.createElement("div");
            actions.className = "settings-asset-controls";
            this.root.appendChild(actions);
            {
                this.search = document.createElement("input");
                this.search.type = "search";
                this.search.placeholder = "Search plugins…";
                this.search.setAttribute("aria-label", "Search plugins");
                this.search.oninput = () => this.render();
                actions.appendChild(this.search);
                this.refresh = document.createElement("button");
                this.refresh.type = "button";
                this.refresh.className = "settings-action-button";
                this.refresh.textContent = "Refresh";
                this.refresh.onclick = () => this.load();
                actions.appendChild(this.refresh);
            }
            this.message = document.createElement("p");
            this.message.setAttribute("role", "status");
            this.message.textContent = "Load the online catalog to browse. Installed plugins and local file installation work offline.";
            this.root.appendChild(this.message);
            this.list = document.createElement("div");
            this.list.className = "settings-plugin-list";
            this.root.appendChild(this.list);
        }
    }

    async load() {
        if (this.busy) {
            return;
        }
        this.busy = true;
        this.refresh.disabled = true;
        this.message.textContent = "Loading catalog…";
        this.entries = [];
        this.render();
        try {
            this.entries = await PluginCatalog.load();
            this.message.textContent = `${this.entries.length} plugins available. Review the source before installing; plugins can access this app.`;
        } catch (error) {
            this.message.textContent = `Could not load catalog: ${error.message} You can still install local files.`;
        } finally {
            this.busy = false;
            this.refresh.disabled = false;
            this.render();
        }
    }

    render() {
        this.list.replaceChildren();
        let query = this.search.value.trim().toLowerCase();
        let installed = PluginManager.getPlugins();
        for (let entry of this.entries.filter(entry =>
            [entry.name, entry.description, entry.author, entry.category].join(" ").toLowerCase().includes(query))) {
            let current = installed.find(plugin => plugin.id === entry.id);
            let row = document.createElement("div");
            row.className = "settings-plugin-row";
            this.list.appendChild(row);
            {
                let details = document.createElement("div");
                details.className = "settings-plugin-details";
                row.appendChild(details);
                {
                    let name = document.createElement("strong");
                    name.textContent = entry.name;
                    details.appendChild(name);
                    let metadata = document.createElement("div");
                    metadata.textContent = `${entry.version} · ${entry.author} · ${entry.category} · ${entry.license}`;
                    details.appendChild(metadata);
                    let description = document.createElement("p");
                    description.textContent = entry.description;
                    details.appendChild(description);
                    if (entry.website) {
                        let creator = document.createElement("a");
                        creator.textContent = `Original creator: ${entry.author}`;
                        creator.href = entry.website;
                        creator.target = "_blank";
                        creator.rel = "noopener noreferrer";
                        details.appendChild(creator);
                        details.appendChild(document.createElement("br"));
                    }
                    let link = document.createElement("a");
                    link.textContent = "View source / download for offline installation";
                    link.href = entry.url;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    details.appendChild(link);
                }
                let button = document.createElement("button");
                button.type = "button";
                button.className = "settings-action-button";
                button.textContent = current?.version === entry.version ? "Installed"
                    : current ? "Install this version" : "Install";
                button.disabled = this.busy || current?.version === entry.version;
                button.onclick = () => this.install(entry);
                row.appendChild(button);
            }
        }
        if (this.entries.length && !this.list.childElementCount) {
            this.list.textContent = "No plugins match your search.";
        }
    }

    async install(entry) {
        if (this.busy) {
            return;
        }
        this.busy = true;
        this.refresh.disabled = true;
        this.render();
        try {
            let choice = await TaskDialog.show({
                title: "Install plugin", message: `Install ${entry.name} ${entry.version} from ${new URL(entry.url).host}? Plugins run code with access to this app. Only continue if you trust this source.`,
                cancelValue: "cancel", choices: [
                    {value: "install", title: "Install", description: "Download, verify, and store this plugin locally."},
                    {value: "cancel", title: "Cancel", description: "Do not install this plugin."}
                ]
            });
            if (choice === "install") {
                await PluginCatalog.install(entry);
                this.setStatus(`Installed ${entry.name} ${entry.version}. Available offline.`);
            }
        } catch (error) {
            this.message.textContent = `Installation failed: ${error.message}`;
        } finally {
            this.busy = false;
            this.refresh.disabled = false;
            this.render();
        }
    }
}
