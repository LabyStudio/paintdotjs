class Item extends UIElement {

    constructor(id, pressable = null) {
        super(id);
        this.pressable = pressable;
        this.enabled = this.isImplemented();
        this.element = null;
    }

    initialize(parent) {
        super.initialize(parent);
        this.element = this.buildElement();

        if (!this.isImplemented()) {
            this.element.setAttribute("title", "Not implemented");
        }

        // Update enabled state on element
        this.setEnabled(this.enabled);

        this.element.onclick = event => {
            this.onPress(event);

            if (!this.isClickable()) {
                event.stopPropagation();
            }
        }
    }

    updateDocument() {
        if (this.element === null || this.element.parentElement === null) {
            return;
        }

        let parent = this.element.parentElement;
        let previousElement = this.element;
        parent.replaceChild(this.element = this.buildElement(), previousElement);
        this.element.onclick = previousElement.onclick;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.element.removeAttribute("disabled");
        } else {
            this.element.setAttribute("disabled", "")
        }
    }

    shouldPress(event) {
        return true;
    }

    onPress(event) {
        if (this.pressable !== null) {
            this.pressable();
        }
    }

    setPressable(pressable) {
        this.pressable = pressable;
    }

    isImplemented() {
        return !this.isClickable() || this.pressable !== null;
    }

    isEnabled() {
        return this.enabled;
    }

    getElement() {
        return this.element;
    }

    buildElement() {
    }

    isClickable() {
        return true;
    }

    updateParent(parent) {
        this.parent = parent;
    }

    registerMouseEventsCombined(element, onMouseEvent) {
        this.registerMouseEvents(element, onMouseEvent, onMouseEvent, onMouseEvent);
    }

    registerMouseEvents(element, onMouseDown, onMouseMove, onMouseUp) {
        element.onmousedown = event => {
            onMouseDown(event.clientX, event.clientY, event.button);
            document.addEventListener("mouseup", event => {
                onMouseUp(event.clientX, event.clientY, event.button);
                document.removeEventListener("mousemove", this.moveEvent);
            }, {once: true});
            document.addEventListener("mousemove", this.moveEvent = event => {
                onMouseMove(event.clientX, event.clientY, event.button);
            });
        }
    }
}