class LayerItem extends MenuItem {

    constructor(layer) {
        super();

        this.layer = layer;
        this.selected = false;
        this.enabled = true;

        this.thumbnail = null;
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " layer-item";
        if (this.selected) {
            element.className += " selected-layer";
        }
        element.innerHTML = "";
        {
            let maxThumbnailSize = 40;
            let ratio = this.layer.width / this.layer.height;
            let thumbnailWidth = ratio > 1 ? maxThumbnailSize : maxThumbnailSize * ratio;
            let thumbnailHeight = ratio > 1 ? maxThumbnailSize / ratio : maxThumbnailSize;
            let thumbnailMargin = (maxThumbnailSize - thumbnailWidth) / 2;

            // Thumbnail
            this.thumbnail = document.createElement("canvas");
            this.thumbnail.className = "thumbnail";
            this.thumbnail.width = thumbnailWidth;
            this.thumbnail.height = thumbnailHeight;
            this.thumbnail.style.paddingLeft = thumbnailMargin + "px";
            this.thumbnail.style.paddingRight = thumbnailMargin + "px";
            this.renderThumbnail();
            element.appendChild(this.thumbnail);

            // Name
            let name = document.createElement("span");
            name.innerHTML = this.layer.properties.name;
            element.appendChild(name);

            // Visible checkbox
            let visibleCheckbox = new CheckboxItem();
            visibleCheckbox.type = "checkbox";
            visibleCheckbox.checked = this.layer.properties.visible;
            visibleCheckbox.setChangeCallback((checked) => {
                this.layer.setVisible(checked);
                this.app.fire("document:layer_properties_changed");
            });
            visibleCheckbox.appendTo(element, this);
        }
        return element;
    }

    setSelected(selected) {
        this.selected = selected;
    }

    renderThumbnail() {
        if (this.thumbnail === null) {
            return;
        }

        let layerCanvas = this.layer.surface.canvas;

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
}