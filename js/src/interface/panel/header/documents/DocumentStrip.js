class DocumentStrip extends Panel {

    constructor() {
        super("documentStrip");

        this.scrollSession = new ScrollSession();
        this.thumbnailUpdates = new Debounced();
        this.navigationFrame = null;
        this.documentListOpen = false;

        this.app.on("app:create_document", (documentWorkspace) => {
            this.documentsListItem.add(this.createDocumentItem(documentWorkspace));
            this.refreshDocumentsList();
            this.updateActiveDocument();
        });
        this.app.on("app:update_active_document", () => {
            this.updateActiveDocument();
        });
        this.app.on("app:close_document", (documentWorkspace) => {
            this.documentsListItem.items = this.documentsListItem.items.filter(item =>
                item.getDocumentWorkspace() !== documentWorkspace
            );
            this.documentsListItem.selectedItem = this.getItemByDocumentWorkspace(
                this.app.getActiveDocumentWorkspace()
            );
            this.refreshDocumentsList();
        });
        this.app.on("document:dirty_changed", (documentWorkspace) => {
            const item = this.getItemByDocumentWorkspace(documentWorkspace);
            if (item !== null) item.updateDirtyIndicator();
        });
        this.app.on("document:file_changed", (documentWorkspace) => {
            const item = this.getItemByDocumentWorkspace(documentWorkspace);
            if (item !== null) item.reinitialize();
            if (this.documentListOpen) this.populateDocumentList();
        });
        this.app.on("document:render_layer_region", (layer, region) => {
            if (!(layer instanceof BitmapLayer)) {
                return;
            }
            const documentWorkspace = layer.getDocumentWorkspace();
            this.thumbnailUpdates.debounceTimeout(documentWorkspace, 80, () => {
                let item = this.getItemByDocumentWorkspace(documentWorkspace);
                if (item !== null) {
                    item.renderThumbnail();
                    this.updatePopupThumbnail(documentWorkspace);
                }
            });
        });
    }

    initialize(parent) {
        super.initialize(parent);

        this.documentsListItem = new ScrollList(ScrollOrientation.HORIZONTAL, "documentsList", this.scrollSession);
        this.documentsListItem.setScrollSpeed(0.75);
        this.documentsListItem.setSelectCallback((item) => {
            let documentWorkspace = item.getDocumentWorkspace();
            if (documentWorkspace !== null) {
                this.app.setActiveDocumentWorkspace(documentWorkspace);
            }
        });
        this.documentsListItem.setItemSwapper((item1, item2) => {
            const index1 = this.documentsListItem.items.indexOf(item1);
            const index2 = this.documentsListItem.items.indexOf(item2);
            if (index1 < 0 || index2 < 0) return;

            const documentWorkspaces = this.app.getDocumentWorkspaces();
            const workspace1 = item1.getDocumentWorkspace();
            const workspace2 = item2.getDocumentWorkspace();
            const workspaceIndex1 = documentWorkspaces.indexOf(workspace1);
            const workspaceIndex2 = documentWorkspaces.indexOf(workspace2);
            if (workspaceIndex1 < 0 || workspaceIndex2 < 0) return;

            [this.documentsListItem.items[index1], this.documentsListItem.items[index2]] =
                [this.documentsListItem.items[index2], this.documentsListItem.items[index1]];
            [documentWorkspaces[workspaceIndex1], documentWorkspaces[workspaceIndex2]] =
                [documentWorkspaces[workspaceIndex2], documentWorkspaces[workspaceIndex1]];
            this.refreshDocumentsList();
        });
        {
            let documentWorkspaces = this.app.getDocumentWorkspaces();
            for (let documentWorkspace of documentWorkspaces) {
                let item = this.createDocumentItem(documentWorkspace);
                this.documentsListItem.add(item);

                if (documentWorkspace === this.app.getActiveDocumentWorkspace()) {
                    this.documentsListItem.setSelected(item);
                }
            }
        }
        this.documentsListItem.appendTo(this.element, this);
        this.documentsListItem.postInitialize();

        this.previousButton = this.createNavigationButton(
            "document-strip-previous", "Previous documents",
            "assets/images/image_strip_scroll_left_arrow.png", () => this.scrollByDocument(-1));
        this.nextButton = this.createNavigationButton(
            "document-strip-next", "More documents",
            "assets/images/image_strip_scroll_right_arrow.png", () => this.scrollByDocument(1));
        this.documentListButton = this.createNavigationButton(
            "document-strip-list", "Show all open images",
            "assets/images/tool_bar_image_list_menu_open_button.png", () => this.toggleDocumentList(), false);
        this.documentListButton.setAttribute("aria-haspopup", "listbox");
        this.documentListButton.setAttribute("aria-expanded", "false");

        this.documentListPopup = document.createElement("div");
        this.documentListPopup.className = "document-list-popup";
        this.documentListPopup.setAttribute("role", "listbox");
        this.documentListPopup.hidden = true;
        this.element.append(this.previousButton, this.nextButton,
            this.documentListButton, this.documentListPopup);
        this.updatePreferredWidth();

        this.element.addEventListener("scroll", event => {
            if (event.target === this.documentsListItem.getElement()) this.scheduleNavigationUpdate();
        }, true);
        this.resizeObserver = new ResizeObserver(() => this.scheduleNavigationUpdate());
        this.resizeObserver.observe(this.element);
        document.addEventListener("pointerdown", event => {
            if (this.documentListOpen && !this.element.contains(event.target)) this.hideDocumentList();
        }, true);
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && this.documentListOpen) {
                this.hideDocumentList();
                this.documentListButton.focus();
            }
        }, true);
        this.scheduleNavigationUpdate();
    }

    createNavigationButton(className, title, imageSource, action, repeat = true) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "document-strip-button " + className;
        button.title = title;
        button.setAttribute("aria-label", title);
        const image = document.createElement("img");
        image.src = imageSource;
        image.alt = "";
        image.draggable = false;
        button.appendChild(image);

        let delay = null;
        let interval = null;
        const stop = () => {
            if (delay !== null) clearTimeout(delay);
            if (interval !== null) clearInterval(interval);
            delay = null;
            interval = null;
        };
        if (repeat) {
            button.onpointerdown = event => {
                if (event.button !== 0 || button.disabled) return;
                event.preventDefault();
                button.setPointerCapture(event.pointerId);
                action();
                delay = setTimeout(() => interval = setInterval(action, 65), 400);
            };
            button.onpointerup = button.onpointercancel = stop;
            button.onlostpointercapture = stop;
            button.onclick = event => {
                if (event.detail === 0) action();
                event.preventDefault();
            };
        } else {
            button.onclick = event => {
                event.stopPropagation();
                action();
            };
        }
        return button;
    }

    refreshDocumentsList() {
        this.documentsListItem.reinitialize();
        this.updatePreferredWidth();
        this.scheduleNavigationUpdate();
        if (this.documentListOpen) this.populateDocumentList();
    }

    updatePreferredWidth() {
        const documentCount = this.documentsListItem.items.length;
        if (documentCount === 0) {
            this.element.style.width = "0px";
            return;
        }

        const firstItem = this.documentsListItem.getElement().querySelector(".scroll-item");
        const itemWidth = firstItem?.getBoundingClientRect().width || 72;
        this.element.style.width = `${Math.ceil(documentCount * itemWidth) + 19}px`;
    }

    scheduleNavigationUpdate() {
        if (this.navigationFrame !== null) cancelAnimationFrame(this.navigationFrame);
        this.navigationFrame = requestAnimationFrame(() => {
            this.navigationFrame = null;
            this.updateNavigation();
        });
    }

    updateNavigation() {
        if (this.documentsListItem === null || this.previousButton === undefined) return;
        const list = this.documentsListItem.getElement();
        const maximum = Math.max(0, list.scrollWidth - list.clientWidth);
        const canScrollLeft = list.scrollLeft > 1;
        const canScrollRight = maximum > 1 && list.scrollLeft < maximum - 1;
        this.previousButton.hidden = !canScrollLeft;
        this.nextButton.hidden = !canScrollRight;
        list.classList.toggle("document-overflow-left", canScrollLeft);
        list.classList.toggle("document-overflow-right", canScrollRight);
        const hasDocuments = this.documentsListItem.items.length > 0;
        this.documentListButton.hidden = !hasDocuments;
        if (!hasDocuments) this.hideDocumentList();
    }

    scrollByDocument(direction) {
        const list = this.documentsListItem.getElement();
        const firstItem = list.querySelector(".scroll-item");
        const amount = firstItem === null ? list.clientHeight : firstItem.getBoundingClientRect().width;
        list.scrollBy({left: direction * amount, behavior: "smooth"});
    }

    toggleDocumentList() {
        if (this.documentListOpen) this.hideDocumentList(); else this.showDocumentList();
    }

    showDocumentList() {
        if (this.documentsListItem.items.length === 0) return;
        this.populateDocumentList();
        this.documentListOpen = true;
        this.documentListPopup.hidden = false;
        this.documentListButton.classList.add("pushed");
        this.documentListButton.setAttribute("aria-expanded", "true");
        requestAnimationFrame(() => {
            this.documentListPopup.querySelector(".selected")?.scrollIntoView({block: "nearest"});
        });
    }

    hideDocumentList() {
        if (this.documentListPopup === undefined) return;
        this.documentListOpen = false;
        this.documentListPopup.hidden = true;
        this.documentListButton.classList.remove("pushed");
        this.documentListButton.setAttribute("aria-expanded", "false");
    }

    populateDocumentList() {
        this.documentListPopup.replaceChildren();
        const activeWorkspace = this.app.getActiveDocumentWorkspace();
        let longestNameWidth = 0;
        const textContext = document.createElement("canvas").getContext("2d");
        textContext.font = "14px Segoe UI, sans-serif";
        for (const item of this.documentsListItem.items) {
            const workspace = item.getDocumentWorkspace();
            const entry = document.createElement("button");
            entry.type = "button";
            entry.className = "document-list-entry";
            entry.classList.toggle("selected", workspace === activeWorkspace);
            entry.setAttribute("role", "option");
            entry.setAttribute("aria-selected", String(workspace === activeWorkspace));
            entry.dataset.documentIndex = String(this.documentsListItem.items.indexOf(item));

            const preview = document.createElement("span");
            preview.className = "document-list-preview";
            const thumbnail = document.createElement("canvas");
            thumbnail.className = "document-list-thumbnail";
            this.copyThumbnail(item, thumbnail);
            preview.appendChild(thumbnail);
            const name = document.createElement("span");
            name.className = "document-list-name";
            name.textContent = workspace.getFriendlyName();
            longestNameWidth = Math.max(longestNameWidth, textContext.measureText(name.textContent).width);
            entry.title = workspace.getFriendlyName();
            entry.append(preview, name);
            entry.onclick = () => {
                this.app.setActiveDocumentWorkspace(workspace);
                this.hideDocumentList();
                this.updateActiveDocument();
            };
            this.documentListPopup.appendChild(entry);
        }
        // Paint.NET sizes this owner-drawn list to its thumbnails and longest
        // file name instead of leaving a large, fixed-width menu.
        const popupWidth = Math.min(360, Math.max(200, Math.ceil(125 + longestNameWidth)));
        this.documentListPopup.style.width = `${popupWidth}px`;
    }

    copyThumbnail(item, destination) {
        const source = item.thumbnail;
        if (source === null || source.width === 0 || source.height === 0) return;
        destination.width = source.width;
        destination.height = source.height;
        const scale = Math.min(88 / source.width, 64 / source.height);
        destination.style.width = `${Math.round(source.width * scale)}px`;
        destination.style.height = `${Math.round(source.height * scale)}px`;
        destination.getContext("2d").drawImage(source, 0, 0);
    }

    updatePopupThumbnail(documentWorkspace) {
        if (!this.documentListOpen) return;
        const index = this.documentsListItem.items.findIndex(item =>
            item.getDocumentWorkspace() === documentWorkspace);
        if (index < 0) return;
        const destination = this.documentListPopup.querySelector(
            `.document-list-entry[data-document-index="${index}"] canvas`);
        if (destination !== null) this.copyThumbnail(this.documentsListItem.items[index], destination);
    }

    createDocumentItem(documentWorkspace) {
        const item = new DocumentItem(documentWorkspace);
        item.setContextMenuCallback(event => {
            const previousWorkspace = this.app.getActiveDocumentWorkspace();
            if (previousWorkspace !== documentWorkspace) {
                this.app.setActiveDocumentWorkspace(documentWorkspace);
            }
            DocumentContextMenu.show(event.clientX, event.clientY, documentWorkspace, previousWorkspace);
        });
        return item;
    }

    updateActiveDocument() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        let item = this.getItemByDocumentWorkspace(activeDocumentWorkspace);
        if (item !== null) {
            this.documentsListItem.setSelected(item);
            this.documentsListItem.scrollToSelected();
            this.scheduleNavigationUpdate();
            if (this.documentListOpen) this.populateDocumentList();
        }
    }

    getItemByDocumentWorkspace(documentWorkspace) {
        if (this.documentsListItem === null) {
            return null;
        }
        for (let item of this.documentsListItem.items) {
            if (item.getDocumentWorkspace() === documentWorkspace) {
                return item;
            }
        }
        return null;
    }
}
