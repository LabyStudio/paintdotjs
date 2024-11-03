class DocumentItem extends MenuItem {

    constructor(documentWorkspace) {
        super();

        this.documentWorkspace = documentWorkspace;
        this.enabled = true;

        this.thumbnail = null;
    }

    buildElement() {
        let element = super.buildElement();
        {
            // Header
            let header = document.createElement("div");
            header.className = "header";
            {
                // Unsaved indicator
                let unsavedIndicator = document.createElement("img");
                unsavedIndicator.className = "dirty-indicator";
                unsavedIndicator.src = ImageUtil.createDirtyStar(10);
                header.appendChild(unsavedIndicator);

                // Close button
                let closeButtonElement = document.createElement("button");
                closeButtonElement.className = "window-close-button";
                closeButtonElement.innerHTML = "x";
                closeButtonElement.onclick = () => {
                    // TODO: Implement close button
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
        return element;
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
