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
        activeDocumentWorkspace.setZoom(value / 100);
    }

    getCurrentValue() {
        let activeDocumentWorkspace = this.app.getActiveDocumentWorkspace();
        if (activeDocumentWorkspace === null) {
            return 100;
        }
        return activeDocumentWorkspace.getZoom() * 100;
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