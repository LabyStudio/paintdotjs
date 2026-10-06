class DocumentItem extends MenuItem {

    constructor(documentWorkspace) {
        super();

        this.documentWorkspace = documentWorkspace;
        this.enabled = true;

        this.thumbnail = null;
        this.dirtyIndicator = null;
        this.contextMenuCallback = null;
    }

    buildElement() {
        let element = super.buildElement();
        {
            // Header
            let header = document.createElement("div");
            header.className = "header";
            {
                // Unsaved indicator
                this.dirtyIndicator = document.createElement("img");
                this.dirtyIndicator.className = "dirty-indicator";
                this.dirtyIndicator.src = ImageUtil.createDirtyStar(10);
                this.dirtyIndicator.title = "Unsaved changes";
                header.appendChild(this.dirtyIndicator);

                // Close button
                let closeButtonElement = document.createElement("button");
                closeButtonElement.className = "window-close-button";
                closeButtonElement.innerHTML = "x";
                closeButtonElement.title = "Close " + this.documentWorkspace.getFriendlyName();
                closeButtonElement.onclick = event => {
                    event.stopPropagation();
                    window.app.closeDocumentWorkspace(this.documentWorkspace);
                };
                header.appendChild(closeButtonElement);
            }
            element.appendChild(header);

            // Thumbnail
            this.thumbnail = document.createElement("canvas");
            this.thumbnail.className = "thumbnail landscape";
            this.renderThumbnail();
            element.appendChild(this.thumbnail);
        }
        this.updateDirtyIndicator();
        element.addEventListener("contextmenu", event => {
            if (this.contextMenuCallback === null) return;
            event.preventDefault();
            event.stopPropagation();
            this.contextMenuCallback(event, this);
        });
        return element;
    }

    updateDirtyIndicator() {
        if (this.dirtyIndicator !== null) {
            this.dirtyIndicator.style.visibility = this.documentWorkspace.isDirty() ? "visible" : "hidden";
        }
    }

    renderThumbnail() {
        if (this.thumbnail === null) {
            return;
        }

        let layerCanvas = this.documentWorkspace.getCompositionSurface().getCanvas();
        const maxThumbnailSize = 96;
        const scale = Math.min(maxThumbnailSize / layerCanvas.width, maxThumbnailSize / layerCanvas.height);
        const thumbnailWidth = Math.max(1, Math.round(layerCanvas.width * scale));
        const thumbnailHeight = Math.max(1, Math.round(layerCanvas.height * scale));

        this.thumbnail.classList.toggle("landscape", layerCanvas.width >= layerCanvas.height);
        this.thumbnail.classList.toggle("portrait", layerCanvas.width < layerCanvas.height);

        // Canvas defaults to 300x150, which forced every document preview into
        // a 2:1 ratio. Size the backing canvas to the document's actual ratio.
        if (this.thumbnail.width !== thumbnailWidth || this.thumbnail.height !== thumbnailHeight) {
            this.thumbnail.width = thumbnailWidth;
            this.thumbnail.height = thumbnailHeight;
        }

        // Replace the old thumbnail instead of alpha-compositing over it. This
        // matters for documents whose composition contains transparent pixels.
        let context = this.thumbnail.getContext("2d");
        context.clearRect(0, 0, this.thumbnail.width, this.thumbnail.height);
        ImageUtil.drawImage(
            context,
            layerCanvas,
            0,
            0,
            layerCanvas.width,
            layerCanvas.height,
            0,
            0,
            this.thumbnail.width,
            this.thumbnail.height
        );
    }

    getText() {
        return null;
    }

    getDocumentWorkspace() {
        return this.documentWorkspace;
    }

    setContextMenuCallback(callback) {
        this.contextMenuCallback = callback;
    }

    getKey() {
        return this.documentWorkspace;
    }

}
