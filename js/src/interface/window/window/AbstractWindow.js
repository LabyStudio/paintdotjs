class AbstractWindow {

    constructor() {
        this.open = false;

        this.app = app;
    }

    create() {
        this.open = true;
        this.app.fire("app:window_open_state_changed", this, true);
    }

    close() {
        this.open = false;
        this.app.fire("app:window_open_state_changed", this, false);
    }

    isOpen() {
        return this.open;
    }

    setTitle(title) {
        throw new Error("Not implemented");
    }

    setSize(width, height) {
        throw new Error("Not implemented");
    }

    setPosition(x, y) {
        throw new Error("Not implemented");
    }

    getWidth() {
        throw new Error("Not implemented");
    }

    getHeight() {
        throw new Error("Not implemented");
    }

}