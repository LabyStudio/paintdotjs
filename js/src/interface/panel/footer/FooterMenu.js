class FooterMenu extends StripPanel {

    constructor() {
        super("footerMenu", {
            items: [
                new ToolInfoItem(),
                new CanvasSizeItem(),
                new CursorPositionItem(),
                new MeasurementUnitSelectorItem(),
                new ViewZoomPercentageItem(),
                new ViewActualSizeItem(),
                new ViewZoomOutItem(),
                new ViewZoomSliderItem(),
                new ViewZoomInItem(),
            ]
        });
    }

}