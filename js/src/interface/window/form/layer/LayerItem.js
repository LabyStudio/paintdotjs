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

class LayerItem extends MenuItem {

    constructor(layer, doubleClickCallback = null) {
        super();

        this.layer = layer;
        this.doubleClickCallback = doubleClickCallback;
        this.enabled = true;

        this.thumbnail = null;
    }

    buildElement() {
        let element = super.buildElement();
        element.className += " layer-item";

        // Double-click
        element.ondblclick = event => {
            if (event.target.closest("input") !== null) {
                return;
            }
            if (this.doubleClickCallback !== null) {
                this.doubleClickCallback(this);
            }
        };
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

                if (!checked && typeof AppSettingsStore !== "undefined"
                    && AppSettingsStore.get("ui.autoSelectVisibleLayer", false)) {
                    const workspace = this.app.getActiveDocumentWorkspace();
                    if (workspace !== null && workspace.getActiveLayer() === this.layer) {
                        const layers = workspace.getDocument().getLayers();
                        const currentIndex = layers.indexOf(this.layer);
                        for (let distance = 1; distance < layers.getLayerCount(); distance++) {
                            const below = layers.getAt(currentIndex - distance);
                            const above = layers.getAt(currentIndex + distance);
                            const nearest = below?.isVisible() ? below : (above?.isVisible() ? above : null);
                            if (nearest !== null) {
                                workspace.setActiveLayer(nearest);
                                break;
                            }
                        }
                    }
                }

                this.app.fire("document:layer_properties_changed");
            });
            visibleCheckbox.appendTo(element, this);
        }
        return element;
    }

    renderThumbnail() {
        if (this.thumbnail === null) {
            return;
        }

        let layerCanvas = this.layer.getSurface().canvas;

        // A layer may become transparent when pixels are moved or erased.
        // Clear the previous frame so transparent pixels replace old preview data.
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

    getLayer() {
        return this.layer;
    }

    getKey() {
        return this.layer;
    }
}
