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
            this.message.textContent = "Loading the plugin catalog…";
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
            this.message.textContent = `${this.entries.length} plugins available.`;
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
                    let author = document.createElement("div");
                    author.className = "settings-plugin-author";
                    author.append("by ");
                    if (entry.website) {
                        let creator = document.createElement("a");
                        creator.textContent = entry.author;
                        creator.href = entry.website;
                        creator.target = "_blank";
                        creator.rel = "noopener noreferrer";
                        author.appendChild(creator);
                    } else {
                        author.append(entry.author);
                    }
                    details.appendChild(author);
                    let description = document.createElement("p");
                    description.textContent = entry.description;
                    details.appendChild(description);
                }
                let actions = document.createElement("div");
                actions.className = "settings-plugin-catalog-actions";
                row.appendChild(actions);
                {
                    let source = document.createElement("a");
                    source.className = "settings-plugin-catalog-link";
                    source.textContent = "View source";
                    source.href = entry.source;
                    source.target = "_blank";
                    source.rel = "noopener noreferrer";
                    actions.appendChild(source);

                    let download = document.createElement("a");
                    download.className = "settings-plugin-catalog-link";
                    download.textContent = "Download";
                    download.href = entry.url;
                    download.target = "_blank";
                    download.rel = "noopener noreferrer";
                    actions.appendChild(download);

                    let button = document.createElement("button");
                    button.type = "button";
                    button.className = "settings-action-button";
                    button.textContent = current?.version === entry.version ? "Installed"
                        : current ? "Update" : "Install";
                    button.disabled = this.busy || current?.version === entry.version;
                    button.onclick = () => this.install(entry);
                    actions.appendChild(button);
                }
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
