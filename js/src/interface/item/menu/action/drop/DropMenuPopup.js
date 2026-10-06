class DropMenuPopup {

    constructor(ownerId, {
        commandMenu = false,
        className = "",
        exclusive = true,
        closeOwner = null,
        onClose = null
    } = {}) {
        this.ownerId = ownerId;
        this.commandMenu = commandMenu;
        this.className = className;
        this.exclusive = exclusive;
        this.closeOwner = closeOwner;
        this.onClose = onClose;
        this.element = null;
        this.parent = null;
    }

    open(items, entryParent = this) {
        this.close();
        if (this.exclusive && DropMenuPopup.activePopup !== null
            && DropMenuPopup.activePopup !== this) {
            DropMenuPopup.activePopup.requestClose();
        }

        const element = document.createElement("div");
        element.className = "drop-menu icon-drop-menu";
        if (this.commandMenu) element.classList.add("command-drop-menu");
        if (this.className) element.classList.add(this.className);
        element.dataset.ownerId = this.ownerId;

        for (const item of items) {
            if (item instanceof UIElement) {
                item.initialize(entryParent);
                element.appendChild(item.getElement());
            } else {
                element.appendChild(item);
            }
        }

        document.body.appendChild(element);
        this.element = element;
        if (this.exclusive) DropMenuPopup.activePopup = this;
        return element;
    }

    positionAt(x, y) {
        if (this.element === null) return;
        const margin = 2;
        this.element.style.left = Math.max(
            margin,
            Math.min(x, window.innerWidth - this.element.offsetWidth - margin)
        ) + "px";
        this.element.style.top = Math.max(
            margin,
            Math.min(y, window.innerHeight - this.element.offsetHeight - margin)
        ) + "px";
    }

    positionAtAnchor(bounds, {alignEnd = false, dropUp = false} = {}) {
        if (this.element === null) return;
        const x = alignEnd ? bounds.right - this.element.offsetWidth : bounds.left;
        const y = dropUp ? bounds.top - this.element.offsetHeight : bounds.bottom;
        this.positionAt(x, y);
    }

    close() {
        if (this.element === null) return;
        this.element.remove();
        this.element = null;
        if (DropMenuPopup.activePopup === this) DropMenuPopup.activePopup = null;
        if (this.onClose !== null) this.onClose();
    }

    requestClose() {
        if (this.closeOwner !== null) this.closeOwner();
        else this.close();
    }
}

DropMenuPopup.activePopup = null;
