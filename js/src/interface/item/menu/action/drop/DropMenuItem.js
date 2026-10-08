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

class DropMenuItem extends MenuItem {

    constructor(id, entries = []) {
        super(id, () => {
            if (this.isEnabled() && !this.isOpen()) {
                this.open();
            }
        });

        this.openMenu = false;
        this.dropMenuElement = null;
        this.dropMenuPopup = null;
        this.entries = entries;

        this.closeListener = event => {
            // Clicking another top-level menu is handled by MainMenu. Do not
            // let the previous menu's outside-click listener close the menu
            // which has just replaced it during the same click event.
            if (this.parent !== null
                && typeof this.parent.onDropMenuHovered === "function"
                && this.parent.getElement().contains(event.target)) {
                return;
            }
            this.close();
        };
    }

    initialize(parent) {
        super.initialize(parent);

        this.setEnabled(this.entries.length > 0);

        for (let entry of this.entries) {
            entry.initialize(this);
        }

        this.element.addEventListener("mouseenter", () => {
            if (this.parent !== null && typeof this.parent.onDropMenuHovered === "function") {
                this.parent.onDropMenuHovered(this);
            }
        });
    }

    add(entry) {
        this.entries.push(entry);
    }

    remove(entry) {
        let index = this.entries.indexOf(entry);
        if (index !== -1) {
            this.entries.splice(index, 1);
        }
    }

    open() {
        if (this.isOpen()) return;
        if (this.parent !== null && typeof this.parent.onDropMenuOpening === "function") {
            this.parent.onDropMenuOpening(this);
        }

        this.dropMenuPopup = new DropMenuPopup(this.id, {
            commandMenu: this.id.startsWith("menu."),
            closeOwner: () => this.close()
        });
        const dropMenu = this.dropMenuPopup.open(this.entries, this);
        this.dropMenuElement = dropMenu;
        this.openMenu = true;

        // Set drop position
        const elementBounds = this.element.getBoundingClientRect();
        this.dropMenuPopup.positionAtAnchor(elementBounds, {
            alignEnd: elementBounds.right > window.innerWidth / 2,
            dropUp: this.isDropUp()
        });

        this.addClassName("open");


        // Register close listener
        setTimeout(_ => {
            document.addEventListener("click", this.closeListener, {once: true});
        });
    }

    close() {
        document.removeEventListener("click", this.closeListener);

        for (const entry of this.entries) {
            if (entry instanceof SubmenuDropEntry) entry.close();
        }

        this.dropMenuPopup?.close();
        this.dropMenuPopup = null;
        this.dropMenuElement = null;
        this.openMenu = false;

        this.removeClass("open");
        if (this.parent !== null && typeof this.parent.onDropMenuClosed === "function") {
            this.parent.onDropMenuClosed(this);
        }
    }

    updateEntriesOn(...eventIds) {
        for (let eventId of eventIds) {
            window.app.on(eventId, () => {
                for (let entry of this.entries) {
                    if (entry instanceof Item) {
                        entry.setEnabledFromActionExecutable();
                    }
                }
            });
        }
    }

    isDropUp() {
        return this.element !== null && this.isDropUpAt(this.element.getBoundingClientRect());
    }

    isDropUpAt(bounds) {
        return bounds.top + bounds.height > window.innerHeight;
    }

    isOpen() {
        return this.openMenu;
    }

    get(id) {
        return this.entries.find(e => e.id === id);
    }
}
