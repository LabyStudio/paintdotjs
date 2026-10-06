class ToolOptionDropdown {

    // Shared renderer for every settings dropdown. Variants only describe
    // content (text/icon) and placement (field/toolbar), never their theme.

    static active = null;

    constructor(options) {
        this.options = options;
        this.value = options.value;
        this.menu = null;
        this.documentClickListener = () => this.close();

        this.element = document.createElement("button");
        this.element.type = "button";
        this.element.className = "tool-dropdown "
            + (options.iconOnly ? "tool-dropdown-icon" : "tool-dropdown-text")
            + (options.toolbar ? " tool-dropdown-toolbar" : " tool-dropdown-field");
        if (options.cycleOnMainClick) this.element.classList.add("tool-dropdown-split");
        this.element.style.width = options.width + "px";
        this.element.style.minWidth = options.width + "px";

        if (options.leadingIcon) {
            this.leadingIcon = document.createElement("img");
            this.leadingIcon.className = "tool-dropdown-leading-icon";
            this.leadingIcon.src = "assets/icons/" + options.leadingIcon;
            this.element.appendChild(this.leadingIcon);
        }

        this.valueIcon = document.createElement("img");
        this.valueIcon.className = "tool-dropdown-value-icon";
        this.element.appendChild(this.valueIcon);

        this.valueLabel = document.createElement("span");
        this.valueLabel.className = "tool-dropdown-value-label";
        this.element.appendChild(this.valueLabel);

        this.arrow = document.createElement("span");
        this.arrow.className = "tool-dropdown-arrow";
        this.element.appendChild(this.arrow);

        this.element.onclick = event => {
            event.stopPropagation();
            if (this.options.cycleOnMainClick && event.target !== this.arrow) {
                this.cycle();
            } else {
                this.open();
            }
        };
        this.update();
    }

    getElement() {
        return this.element;
    }

    getSelectedEntry() {
        return this.options.values.find(entry => entry[0] === this.value) || this.options.values[0];
    }

    getIconSource(entry) {
        if (this.options.shapeGrid) return ToolOptionDropdown.getShapeIconSource(entry[0]);
        const iconName = entry[2];
        if (!iconName) return null;
        return iconName.startsWith("data:") ? iconName : "assets/icons/" + iconName;
    }

    update() {
        const entry = this.getSelectedEntry();
        const iconSource = this.getIconSource(entry);
        this.valueIcon.hidden = !iconSource || !!this.options.leadingIcon;
        if (!this.valueIcon.hidden) this.valueIcon.src = iconSource;
        this.valueLabel.hidden = !!this.options.iconOnly;
        this.valueLabel.textContent = entry[1];
        this.element.title = entry[1];
    }

    cycle() {
        if (ToolOptionDropdown.active === this) this.close();
        const index = Math.max(0, this.options.values.findIndex(entry => entry[0] === this.value));
        const entry = this.options.values[(index + 1) % this.options.values.length];
        this.value = entry[0];
        this.update();
        this.options.onChange(entry[0]);
    }

    open() {
        if (ToolOptionDropdown.active === this) {
            this.close();
            return;
        }
        ToolOptionDropdown.closeActive();

        this.menu = document.createElement("div");
        this.menu.className = "tool-dropdown-menu "
            + (this.options.shapeGrid
                ? "tool-shape-grid-menu"
                : this.options.menuCheckmarks
                ? "tool-dropdown-menu-checkmarks"
                : (this.options.iconOnly || this.options.menuIcons
                    ? "tool-dropdown-menu-icons" : "tool-dropdown-menu-text"));
        this.menu.style.minWidth = Math.max(this.options.menuWidth || 0, this.options.width) + "px";

        if (this.options.shapeGrid) {
            this.buildShapeGrid();
        } else {
        for (const entry of this.options.values) {
            const button = document.createElement("button");
            button.type = "button";
            button.toggleAttribute("active", entry[0] === this.value);
            if (this.options.menuCheckmarks) {
                const check = document.createElement("span");
                check.className = "tool-dropdown-check";
                button.appendChild(check);
            } else if (entry[2]) {
                const icon = document.createElement("img");
                icon.src = this.getIconSource(entry);
                button.appendChild(icon);
            }
            const label = document.createElement("span");
            label.textContent = entry[1];
            button.appendChild(label);
            button.onclick = event => {
                event.stopPropagation();
                this.value = entry[0];
                this.update();
                this.options.onChange(entry[0]);
                this.close();
            };
            this.menu.appendChild(button);
        }
        }

        document.body.appendChild(this.menu);
        const bounds = this.element.getBoundingClientRect();
        this.menu.style.left = Math.round(bounds.left) + "px";
        this.menu.style.top = Math.round(bounds.bottom + 1) + "px";
        this.element.setAttribute("aria-expanded", "true");
        ToolOptionDropdown.active = this;
        setTimeout(() => document.addEventListener("click", this.documentClickListener, {once: true}));
    }

    buildShapeGrid() {
        for (const group of this.options.shapeGroups) {
            const heading = document.createElement("div");
            heading.className = "tool-shape-grid-heading";
            heading.textContent = group.label;
            this.menu.appendChild(heading);

            const grid = document.createElement("div");
            grid.className = "tool-shape-grid";
            for (const value of group.values) {
                const entry = this.options.values.find(candidate => candidate[0] === value);
                if (!entry) continue;
                const button = document.createElement("button");
                button.type = "button";
                button.title = entry[1];
                button.setAttribute("aria-label", entry[1]);
                button.toggleAttribute("active", entry[0] === this.value);
                const icon = document.createElement("img");
                icon.src = this.getIconSource(entry);
                icon.alt = "";
                button.appendChild(icon);
                button.onclick = event => {
                    event.stopPropagation();
                    this.value = entry[0];
                    this.update();
                    this.options.onChange(entry[0]);
                    this.close();
                };
                grid.appendChild(button);
            }
            this.menu.appendChild(grid);
        }
    }

    static getShapeIconSource(shape) {
        if (typeof ShapeCatalog !== "undefined" && ShapeCatalog.has(shape)) {
            return ShapeCatalog.getIconSource(shape);
        }
        const paths = {
            rectangle: '<rect x="4" y="5" width="24" height="22"/>',
            roundedRectangle: '<rect x="4" y="5" width="24" height="22" rx="6"/>',
            ellipse: '<ellipse cx="16" cy="16" rx="12" ry="11"/>',
            triangle: '<path d="M16 4 29 27H3Z"/>',
            rightTriangle: '<path d="M5 4v23h24Z"/>',
            diamond: '<path d="m16 3 13 13-13 13L3 16Z"/>',
            trapezoid: '<path d="M9 4h14l6 23H3Z"/>',
            parallelogram: '<path d="M10 4h19l-7 23H3Z"/>',
            pentagon: '<path d="m16 3 13 10-5 15H8L3 13Z"/><text x="16" y="20">5</text>',
            hexagon: '<path d="m9 4 14 0 7 12-7 12H9L2 16Z"/><text x="16" y="20">6</text>',
            heptagon: '<path d="m16 3 11 5 4 11-8 10H9L1 19 5 8Z"/><text x="16" y="20">7</text>',
            octagon: '<path d="m10 3 12 0 8 8v11l-8 8H10l-8-8V11Z"/><text x="16" y="20">8</text>',
            star3: '<path d="m16 2 3 11 11 4-11 3-3 11-3-11-11-3 11-4Z"/>',
            star4: '<path d="m16 2 3 11 11 3-11 3-3 11-3-11-11-3 11-3Z"/>',
            star5: '<path d="m16 2 4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1Z"/>',
            star6: '<path d="m16 2 4 9 10-3-6 8 6 8-10-3-4 9-4-9-10 3 6-8-6-8 10 3Z"/>',
            blockArrow: '<path d="M3 11h14V5l12 11-12 11v-6H3Z"/>',
            notchedArrow: '<path d="m3 11 5 5-5 5h14v6l12-11L17 5v6Z"/>',
            pentagonArrow: '<path d="M3 7h15l11 9-11 9H3Z"/>',
            chevronArrow: '<path d="M3 6h11l12 10-12 10H3l12-10Z"/>',
            rectangularCallout: '<path d="M3 5h26v17H13l-7 6 2-6H3Z"/>',
            roundedCallout: '<path d="M8 5h19q3 0 3 3v11q0 3-3 3H14l-7 6 2-6H8q-4 0-4-4V9q0-4 4-4Z"/>',
            ellipticalCallout: '<path d="M16 4c8 0 14 5 14 11s-6 10-14 10h-3l-7 5 2-7C4 21 2 18 2 15 2 9 8 4 16 4Z"/>',
            cloudCallout: '<path d="M9 24c-4 0-6-3-4-6-4-2-2-7 2-7-1-4 5-6 7-3 2-5 8-3 8 1 5-1 9 4 6 8 2 3 0 7-4 7H9Z"/><circle cx="6" cy="28" r="1.5"/>',
            checkMark: '<path d="m3 17 8 9L29 5l-4-3-14 17-5-6Z"/>',
            multiply: '<path d="m6 3 10 9L26 3l3 4-9 9 9 9-3 4-10-9-10 9-3-4 9-9-9-9Z"/>',
            heart: '<path d="M16 29 4 18C-3 10 8 1 16 9c8-8 19 1 12 9Z"/>',
            lightningBolt: '<path d="M18 2 5 18h9l-2 12 15-18h-9Z"/>',
            gear: '<path d="m13 2 6 0 1 4 4 2 4-2 3 5-3 3v4l3 3-3 5-4-2-4 2-1 4h-6l-1-4-4-2-4 2-3-5 3-3v-4l-3-3 3-5 4 2 4-2Zm3 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" fill-rule="evenodd"/>'
        };
        const body = paths[shape] || paths.rectangle;
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
            + '<g fill="#4f86b8" stroke="#b9dcff" stroke-width="1.7" stroke-linejoin="round">'
            + body + '</g><style>text{fill:white;stroke:none;font:bold 11px Segoe UI;text-anchor:middle}</style></svg>';
        return "data:image/svg+xml," + encodeURIComponent(svg);
    }

    close() {
        document.removeEventListener("click", this.documentClickListener);
        this.element.setAttribute("aria-expanded", "false");
        if (this.menu !== null) this.menu.remove();
        this.menu = null;
        if (ToolOptionDropdown.active === this) ToolOptionDropdown.active = null;
    }

    static closeActive() {
        if (ToolOptionDropdown.active !== null) ToolOptionDropdown.active.close();
    }
}
