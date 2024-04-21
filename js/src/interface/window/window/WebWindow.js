class WebWindow extends AbstractWindow {

    constructor() {
        super();

        this.overlay = document.getElementById("windowOverlay");

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
                this.closeButtonElement.className = "close-button";
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

                // Clamp
                x = Math.max(0, Math.min(this.overlay.clientWidth - this.width, x));
                y = Math.max(0, Math.min(this.overlay.clientHeight - this.height, y));

                this.setPosition(x, y);

                event.preventDefault();
                event.stopPropagation();
            }
        });
        document.addEventListener("mouseup", () => {
            this.dragging = false;
        });
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
        this.x = x;
        this.y = y;

        if (this.windowElement !== null) {
            this.windowElement.style.left = x + "px";
            this.windowElement.style.top = y + "px";
        }
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    close() {
        this.overlay.removeChild(this.windowElement);
    }
}