class DocumentItem extends MenuItem {

    constructor(documentWorkspace) {
        super();

        this.documentWorkspace = documentWorkspace;
        this.enabled = true;

        this.thumbnail = null;
        this.dirtyIndicator = null;
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
            this.thumbnail.className = "thumbnail";
            this.renderThumbnail();
            element.appendChild(this.thumbnail);
        }
        this.updateDirtyIndicator();
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

        // Render thumbnail
        let context = this.thumbnail.getContext("2d");
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

    getKey() {
        return this.documentWorkspace;
    }

}
