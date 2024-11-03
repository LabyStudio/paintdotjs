class WebWindow extends AbstractWindow {

    constructor() {
        super();

        this.overlay = document.getElementById("windowOverlay");
        this.view = document.getElementById("view");

        this.title = "Untitled Window";
        this.content = null;

        this.windowElement = null;
        this.titleBarElement = null;
        this.titleElement = null;
        this.closeButtonElement = null;
        this.contentElement = null;

        this.dragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.x = 0;
        this.y = 0;

        this.anchorX = 0;
        this.anchorY = 0;

        window.addEventListener("resize", () => {
            this.applyAnchor();
        });
    }

    create() {
        // Window frame
        this.windowElement = document.createElement("div");
        this.windowElement.className = "window";
        this.windowElement.style.width = this.width + "px";
        this.windowElement.style.height = this.height + "px";
        this.windowElement.style.left = this.x + "px";
        this.windowElement.style.top = this.y + "px";
        {
            // Title bar
            this.titleBarElement = document.createElement("div");
            this.titleBarElement.className = "title-bar";
            this.windowElement.appendChild(this.titleBarElement);
            {
                // Title
                this.titleElement = document.createElement("div");
                this.titleElement.className = "title";
                this.titleElement.innerHTML = this.title;
                this.titleBarElement.appendChild(this.titleElement);

                // Close button
                this.closeButtonElement = document.createElement("button");
                this.closeButtonElement.className = "window-close-button";
                this.closeButtonElement.innerHTML = "x";
                this.closeButtonElement.onclick = () => this.close();
                this.titleBarElement.appendChild(this.closeButtonElement);
            }

            // Content
            this.contentElement = document.createElement("div");
            this.contentElement.className = "content";
            if (this.content !== null) {
                this.contentElement.appendChild(this.content);
            }
            this.windowElement.appendChild(this.contentElement);
        }
        this.overlay.appendChild(this.windowElement);

        // Window movement handling
        this.titleBarElement.addEventListener("mousedown", (event) => {
            this.dragging = true;
            this.dragStartX = event.clientX - this.x;
            this.dragStartY = event.clientY - this.y;

            event.preventDefault();
            event.stopPropagation();
        });
        document.addEventListener("mousemove", (event) => {
            if (this.dragging) {
                let x = event.clientX - this.dragStartX;
                let y = event.clientY - this.dragStartY;

                this.setPositionAligned(x, y);

                event.preventDefault();
                event.stopPropagation();
            }
        });
        document.addEventListener("mouseup", () => {
            this.dragging = false;
        });

        super.create();
    }

    setTitle(title) {
        this.title = title;

        if (this.titleElement !== null) {
            this.titleElement.innerHTML = title;
        }
    }

    setContent(content) {
        this.content = content;

        if (this.contentElement !== null) {
            this.contentElement.innerHTML = "";
            this.contentElement.appendChild(content);
        }
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;

        if (this.windowElement !== null) {
            this.windowElement.style.width = width + "px";
            this.windowElement.style.height = height + "px";
        }
    }

    setPosition(x, y) {
        // Clamp
        x = Math.max(0, Math.min(this.overlay.clientWidth - this.width, x));
        y = Math.max(0, Math.min(this.overlay.clientHeight - this.height, y));

        this.x = x;
        this.y = y;

        let viewBounds = this.getViewBounds();
        this.anchorX = (x - viewBounds.getLeft()) / (viewBounds.getRight() - this.width - viewBounds.getLeft());
        this.anchorY = (y - viewBounds.getTop()) / (viewBounds.getBottom() - this.height - viewBounds.getTop());

        if (this.windowElement !== null) {
            this.windowElement.style.left = x + "px";
            this.windowElement.style.top = y + "px";
        }
    }

    setPositionAligned(x, y) {
        let threshold = 15;
        let border = this.getViewBounds();

        // Align to border
        if (Math.abs(x - border.getLeft()) < threshold) {
            x = border.getLeft();
        }
        if (Math.abs(y - border.getTop()) < threshold) {
            y = border.getTop();
        }
        if (Math.abs(x + this.width - border.getRight()) < threshold) {
            x = border.getRight() - this.width;
        }
        if (Math.abs(y + this.height - border.getBottom()) < threshold) {
            y = border.getBottom() - this.height;
        }

        // Add alignment rectangles of other windows
        let alignmentRectangles = [];
        for (let form of FormRegistry.list()) {
            let window = form.getWindow();
            if (window === this) {
                continue
            }
            alignmentRectangles.push(window.getBounds());
        }

        // Align to other windows
        for (let rectangle of alignmentRectangles) {
            if (Math.abs(x + this.width - rectangle.getLeft()) < threshold) {
                x = rectangle.getLeft() - this.width - threshold / 2;
            }
            if (Math.abs(y + this.height - rectangle.getTop()) < threshold) {
                y = rectangle.getTop() - this.height - threshold / 2;
            }
            if (Math.abs(x - rectangle.getRight()) < threshold) {
                x = rectangle.getRight() + threshold / 2;
            }
            if (Math.abs(y - rectangle.getBottom()) < threshold) {
                y = rectangle.getBottom() + threshold / 2;
            }
        }
        this.setPosition(x, y);
    }

    setAnchor(x, y) {
        this.anchorX = x;
        this.anchorY = y;

        this.applyAnchor();
    }

    applyAnchor() {
        let viewBounds = this.getViewBounds();

        this.setPosition(
            viewBounds.getLeft() + this.anchorX * (viewBounds.getRight() - this.width - viewBounds.getLeft()),
            viewBounds.getTop() + this.anchorY * (viewBounds.getBottom() - this.height - viewBounds.getTop())
        );
    }

    close() {
        this.overlay.removeChild(this.windowElement);
        this.windowElement = null;

        super.close();
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getViewBounds() {
        let viewBounds = this.view.getBoundingClientRect();
        let margin = 10;
        return Rectangle.relative(
            viewBounds.x + margin,
            viewBounds.y + margin - windowTop(),
            this.view.clientWidth - margin * 2,
            this.view.clientHeight - margin * 2
        );
    }

    getBounds() {
        return Rectangle.relative(this.x, this.y, this.width, this.height);
    }
}