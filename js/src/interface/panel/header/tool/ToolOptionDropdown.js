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

    update() {
        const entry = this.getSelectedEntry();
        const iconName = entry[2];
        this.valueIcon.hidden = !iconName || !!this.options.leadingIcon;
        if (!this.valueIcon.hidden) this.valueIcon.src = "assets/icons/" + iconName;
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
            + (this.options.menuCheckmarks
                ? "tool-dropdown-menu-checkmarks"
                : (this.options.iconOnly || this.options.menuIcons
                    ? "tool-dropdown-menu-icons" : "tool-dropdown-menu-text"));
        this.menu.style.minWidth = Math.max(this.options.menuWidth || 0, this.options.width) + "px";

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
                icon.src = "assets/icons/" + entry[2];
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

        document.body.appendChild(this.menu);
        const bounds = this.element.getBoundingClientRect();
        this.menu.style.left = Math.round(bounds.left) + "px";
        this.menu.style.top = Math.round(bounds.bottom + 1) + "px";
        this.element.setAttribute("aria-expanded", "true");
        ToolOptionDropdown.active = this;
        setTimeout(() => document.addEventListener("click", this.documentClickListener, {once: true}));
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
