class ViewZoomSliderItem extends SliderItem {

    constructor() {
        super("menuViewZoomSlider");
    }

    getMin() {
        return 0;
    }

    getMax() {
        return 100;
    }

    getStep() {
        return 2;
    }

    getTicks() {
        return [50];
    }

}