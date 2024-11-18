class ViewZoomSliderItem extends SliderItem {

    constructor() {
        super("menuViewZoomSlider");

        this.app.on("document:update_viewport", rectangle => {
            this.updateCurrentValue();
        });
    }

    onChange(value) {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return;
        }

        let zoom = value > 100 ? Math.pow(10, (value - 100) / 50) : value / 100;
        activeDocumentWorkspace.setZoom(zoom);
    }

    getCurrentValue() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return 100;
        }
        let zoom = activeDocumentWorkspace.getZoom();
        return zoom > 1 ? 100 + Math.log10(zoom) * 50 : zoom * 100;
    }

    getMin() {
        return 1;
    }

    getMax() {
        return 200;
    }

    getStep() {
        return 2;
    }

    getTicks() {
        return [50];
    }

}