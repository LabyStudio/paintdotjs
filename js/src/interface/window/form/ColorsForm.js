class ColorsForm extends Form {

    constructor() {
        super("colorsForm");

        this.mainColor = Color.BLACK;
        this.secondaryColor = Color.WHITE;
        this.selectedIsPrimary = true;

        this.expanded = true; // TODO false

        this.palette = [];

        // Generate palette
        for (let loop = 0; loop < 3; loop++) {
            for (let row = 0; row < 2; row++) {
                for (let column = 0; column < 16; column++) {
                    let hue = (column - 2) / 14;
                    let saturation = column < 2 ? 0 : 1;
                    let lightness = column < 2
                        ? (row % 2 === 0 ? (column === 0 ? 0 : 0.25) : (column === 0 ? 1 : 0.5))
                        : row % 2 === 0 ? 0.5 : 0.25;
                    if (loop === 1) {
                        if (column < 2) {
                            lightness = (row % 2 === 0 ? (column === 0 ? 0.6 : 0.2) : (column === 0 ? 0.75 : 0.4));
                        } else {
                            saturation = row % 2 === 0 ? 1 : 0.25;
                            lightness = row % 2 === 0 ? 0.75 : 0.25;
                        }
                    }
                    let alpha = loop === 2 ? 127 : 255;
                    let color = Color.fromHSL(hue, saturation, lightness, alpha);
                    this.palette.push(color);
                }
            }
        }

        this.mainColorItem = null;
        this.secondaryColorItem = null;
        this.moreLessButtonElement = null;
        this.sliderPanel = null;

        this.redSlider = null;
        this.greenSlider = null;
        this.blueSlider = null;
        this.hueSlider = null;
        this.saturationSlider = null;
        this.lightnessSlider = null;
        this.alphaSlider = null;

        this.redField = null;
        this.greenField = null;
        this.blueField = null;
        this.hexField = null;
        this.hueField = null;
        this.saturationField = null;
        this.lightnessField = null;
        this.alphaField = null;

        this.updating = false;
    }

    initialize(window) {
        super.initialize(window);
        this.updateWindowSize();
    }

    initializeDefault(window) {
        this.updateWindowSize();
        window.setAnchor(0, 1);
    }

    buildContent() {
        let grid = super.buildContent();
        grid.id = "colorsForm";

        // Current colors
        let currentColors = document.createElement("div");
        currentColors.id = "currentColors";
        {
            // Main color
            this.mainColorItem = new ColorPreviewItem("mainColor");
            this.mainColorItem.initialize(currentColors);
            this.mainColorItem.setPressable(() => {
                this.setSelectedIsPrimary(true);
            });
            currentColors.appendChild(this.mainColorItem.getElement());

            // Secondary color
            this.secondaryColorItem = new ColorPreviewItem("secondaryColor");
            this.secondaryColorItem.initialize(currentColors);
            this.secondaryColorItem.setPressable(() => {
                this.setSelectedIsPrimary(false);
            });
            currentColors.appendChild(this.secondaryColorItem.getElement());

            // Swap colors button
            let swapColorsButton = document.createElement("img");
            swapColorsButton.id = "swapColorsButton";
            swapColorsButton.src = "assets/icons/swap_icon.png";
            swapColorsButton.onclick = () => {
                let temp = this.mainColor;
                this.setMainColor(this.secondaryColor, "swap");
                this.setSecondaryColor(temp, "swap");
            };
            currentColors.appendChild(swapColorsButton)

            // Reset button
            let blackAndWhiteButton = document.createElement("img");
            blackAndWhiteButton.id = "blackAndWhiteButton";
            blackAndWhiteButton.src = "assets/icons/black_and_white_icon.png";
            blackAndWhiteButton.onclick = () => {
                this.setMainColor(Color.BLACK, "reset");
                this.setSecondaryColor(Color.WHITE, "reset");
            };
            currentColors.appendChild(blackAndWhiteButton);
        }
        grid.appendChild(currentColors);

        // More/Less button
        this.moreLessButtonElement = document.createElement("button");
        this.moreLessButtonElement.id = "moreLessButton";
        this.moreLessButtonElement.onclick = () => {
            this.setExpanded(!this.expanded);
        };
        grid.appendChild(this.moreLessButtonElement);

        // Color circle
        this.colorCircle = new ColorCircleItem("colorCircle");
        this.colorCircle.initialize(this);
        this.colorCircle.setChangeCallback(color => {
            this.setSelectedColor(color, "circle");
        });
        grid.appendChild(this.colorCircle.getElement());

        // Color settings strip
        let colorSettingsStrip = document.createElement("div");
        colorSettingsStrip.id = "colorSettingsStrip";
        colorSettingsStrip.classList.add("strip");
        {
            // Color add
            this.colorAddElement = new ColorAddItem();
            this.colorAddElement.initialize(this);
            colorSettingsStrip.appendChild(this.colorAddElement.getElement());

            // Swatch
            let swatch = new SwatchItem();
            swatch.initialize(this);
            colorSettingsStrip.appendChild(swatch.getElement());
        }
        grid.appendChild(colorSettingsStrip);

        // Color palette
        let colorPalette = document.createElement("div");
        colorPalette.id = "basicColorPalette";
        colorPalette.classList.add("color-palette");
        {
            for (let i = 0; i < 32; i++) {
                let colorElement = document.createElement("div");
                colorElement.classList.add("color");
                colorElement.style.backgroundImage = this.paletteColor(i);
                colorElement.onmousedown = event => {
                    let isLeftClick = event.button === 0;
                    if (isLeftClick) {
                        this.setSelectedColor(this.palette[i], "palette");
                    } else {
                        this.setNotSelectedColor(this.palette[i], "palette");
                    }
                }
                colorPalette.appendChild(colorElement);
            }
        }
        grid.appendChild(colorPalette);

        // Extended palette
        this.extendedPalette = document.createElement("div");
        this.extendedPalette.id = "extendedColorPalette";
        this.extendedPalette.classList.add("color-palette");
        {
            for (let i = 32; i < 32 * 3; i++) {
                let colorElement = document.createElement("div");
                colorElement.classList.add("color");
                colorElement.style.backgroundImage = this.paletteColor(i);
                colorElement.onmousedown = event => {
                    let isLeftClick = event.button === 0;
                    if (isLeftClick) {
                        this.setSelectedColor(this.palette[i], "palette");
                    } else {
                        this.setNotSelectedColor(this.palette[i], "palette");
                    }
                }
                this.extendedPalette.appendChild(colorElement);
            }
        }
        grid.appendChild(this.extendedPalette);

        // Slider panel (Extended)
        this.sliderPanel = document.createElement("div");
        this.sliderPanel.id = "sliderPanel";
        {
            // RGB Header
            this.sliderPanel.appendChild(this.createHeader("rgbHeader"));

            // Red
            this.sliderPanel.appendChild(this.createChannel(
                "redLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(255, 0, 0)
                ),
                (slider, field) => {
                    this.redSlider = slider;
                    this.redField = field;

                    this.redSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setRed(Math.round(value * 255));
                        this.setSelectedColor(color, "redSlider");
                    });

                    this.redField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setRed(value);
                        this.setSelectedColor(color, "redField");
                    });
                }
            ));

            // Green
            this.sliderPanel.appendChild(this.createChannel(
                "greenLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(0, 255, 0)
                ),
                (slider, field) => {
                    this.greenSlider = slider;
                    this.greenField = field;

                    this.greenSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setGreen(Math.round(value * 255));
                        this.setSelectedColor(color, "greenSlider");
                    });

                    this.greenField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setGreen(value);
                        this.setSelectedColor(color, "greenField");
                    });
                }
            ));

            // Blue
            this.sliderPanel.appendChild(this.createChannel(
                "blueLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(0, 0, 255)
                ),
                (slider, field) => {
                    this.blueSlider = slider;
                    this.blueField = field;

                    this.blueSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setBlue(Math.round(value * 255));
                        this.setSelectedColor(color, "blueSlider");
                    });

                    this.blueField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setBlue(value);
                        this.setSelectedColor(color, "blueField");
                    });
                }
            ));

            // Hex
            this.sliderPanel.appendChild(this.createEntry("hexLabel", "field", () => {
                this.hexField = new TextFieldItem("hex");
                this.hexField.initialize(this);
                this.hexField.setChangeCallback(value => {
                    let red = parseInt(value.substring(0, 2), 16);
                    let green = parseInt(value.substring(2, 4), 16);
                    let blue = parseInt(value.substring(4, 6), 16);
                    if (isNaN(red) || isNaN(green) || isNaN(blue)) {
                        return;
                    }

                    let color = this.getSelectedColor().copy();
                    color.setRed(red);
                    color.setGreen(green);
                    color.setBlue(blue);
                    this.setSelectedColor(color, "hex");
                });
                return this.hexField.getElement();
            }));

            // HSV Header
            this.sliderPanel.appendChild(this.createHeader("hsvHeader"));

            // Hue
            this.sliderPanel.appendChild(this.createChannel(
                "hueLabel",
                v => Color.fromHSL(v, 1, 0.5),
                (slider, field) => {
                    this.hueSlider = slider;
                    this.hueField = field;

                    this.hueSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setHue(value);
                        this.setSelectedColor(color, "hueSlider");
                    });

                    this.hueField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setHue(value / 360);
                        this.setSelectedColor(color, "hueField");
                    });
                }
            ));

            // Saturation
            this.sliderPanel.appendChild(this.createChannel(
                "saturationLabel",
                v => Color.fromHSL(0, v, 0.5),
                (slider, field) => {
                    this.saturationSlider = slider;
                    this.saturationField = field;

                    this.saturationSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setSaturation(value);
                        this.setSelectedColor(color, "saturationSlider");
                    });

                    this.saturationField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setSaturation(value / 100);
                        this.setSelectedColor(color, "saturationField");
                    });
                }
            ));

            // Lightness
            this.sliderPanel.appendChild(this.createChannel(
                "valueLabel",
                ColorSliderItem.rangeProvider(
                    Color.fromRGB(0, 0, 0),
                    Color.fromRGB(255, 255, 255)
                ),
                (slider, field) => {
                    this.lightnessSlider = slider;
                    this.lightnessField = field;

                    this.lightnessSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setLightness(value);
                        this.setSelectedColor(color, "lightnessSlider");
                    });

                    this.lightnessField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setLightness(value / 100);
                        this.setSelectedColor(color, "lightnessField");
                    });
                }
            ));

            // Alpha Header
            this.sliderPanel.appendChild(this.createHeader("alphaHeader"));

            // Alpha
            this.sliderPanel.appendChild(this.createChannel(
                null,
                ColorSliderItem.rangeProvider(
                    Color.fromRGBA(0, 0, 0, 0),
                    Color.fromRGBA(0, 0, 0, 255)
                ),
                (slider, field) => {
                    this.alphaSlider = slider;
                    this.alphaField = field;

                    this.alphaSlider.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setAlpha(Math.round(value * 255));
                        this.setSelectedColor(color, "alphaSlider");
                    });

                    this.alphaField.setChangeCallback(value => {
                        let color = this.getSelectedColor().copy();
                        color.setAlpha(value);
                        this.setSelectedColor(color, "alphaField");
                    });
                }
            ));
        }
        grid.appendChild(this.sliderPanel);

        this.updateElements("init");

        return grid;
    }

    createEntry(id, className, callback) {
        // Header entry
        let entry = document.createElement("div");
        entry.classList.add("entry", className);
        {
            // Text
            let text = document.createElement("div");
            text.classList.add("text");
            text.textContent = id === null ? "" : i18n("colorsForm." + id + ".text");
            entry.appendChild(text);

            // Value
            entry.appendChild(callback());
        }
        return entry;
    }

    createHeader(id) {
        return this.createEntry(id, "header", () => {
            // Divider
            let divider = document.createElement("hr");
            divider.classList.add("divider");
            return divider;
        })
    }

    createChannel(id, colorProvider, itemCallback) {
        return this.createEntry(id, "channel", () => {
            // Row
            let row = document.createElement("div");
            row.classList.add("row");
            {
                // Slider
                let slider = new ColorSliderItem(id, colorProvider);
                slider.initialize(this);
                row.appendChild(slider.getElement());

                // Value
                let field = new NumberItem(id);
                field.initialize(this);
                field.setMax(255);
                row.appendChild(field.getElement());

                itemCallback(slider, field);
            }

            return row;
        })
    }

    setMainColor(color, initiator = null) {
        if (!(color instanceof Color)) {
            throw new Error("Not a color class");
        }
        if (this.updating) {
            return;
        }

        this.mainColor = color;
        this.updateElements(initiator);
    }

    setSecondaryColor(color, initiator = null) {
        if (!(color instanceof Color)) {
            throw new Error("Not a color class");
        }
        if (this.updating) {
            return;
        }

        this.secondaryColor = color;
        this.updateElements(initiator);
    }

    getSelectedColor() {
        return this.selectedIsPrimary ? this.mainColor : this.secondaryColor;
    }

    setSelectedColor(color, initiator = null) {
        if (this.selectedIsPrimary) {
            this.setMainColor(color, initiator);
        } else {
            this.setSecondaryColor(color, initiator);
        }
    }

    setNotSelectedColor(color, initiator = null) {
        if (this.selectedIsPrimary) {
            this.setSecondaryColor(color, initiator);
        } else {
            this.setMainColor(color, initiator);
        }
    }

    setSelectedIsPrimary(isPrimary, initiator = null) {
        this.selectedIsPrimary = isPrimary;
        this.updateElements(initiator);
    }

    setExpanded(expanded) {
        this.expanded = expanded;

        this.updateWindowSize();
        this.updateElements("expand");
    }

    updateWindowSize() {
        if (this.expanded) {
            this.window.setSize(386, 266 + 30);
        } else {
            this.window.setSize(209, 248);
        }
    }

    updateElements(initiator = null) {
        if (this.updating) {
            return;
        }
        this.updating = true;

        let selectedColor = this.getSelectedColor();
        let isPrimary = this.selectedIsPrimary;

        // Update circle
        if (initiator !== "circle") {
            this.colorCircle.setColor(selectedColor);
        }

        // Update color add item
        this.colorAddElement.setColor(selectedColor);

        // Update selected color indicators
        this.mainColorItem.setColor(this.mainColor);
        this.mainColorItem.setSelected(isPrimary);
        this.secondaryColorItem.setColor(this.secondaryColor);
        this.secondaryColorItem.setSelected(!isPrimary);

        this.moreLessButtonElement.textContent = this.expanded
            ? i18n("colorsForm.moreLessButton.text.less") + " <<"
            : i18n("colorsForm.moreLessButton.text.more") + " >>";
        this.sliderPanel.style.display = this.expanded ? "block" : "none";
        this.extendedPalette.style.display = this.expanded ? "flex" : "none";

        // Update hex field
        if (initiator !== "hex") {
            this.hexField.setText((selectedColor.getRed().toString(16).padStart(2, "0")
                + selectedColor.getGreen().toString(16).padStart(2, "0")
                + selectedColor.getBlue().toString(16).padStart(2, "0"))
                .toUpperCase());
        }

        let isHSVInitiator = initiator === "hueSlider"
            || initiator === "saturationSlider"
            || initiator === "lightnessSlider"
            || initiator === "hueField"
            || initiator === "saturationField"
            || initiator === "lightnessField";

        // Update sliders
        if (initiator !== "redSlider") {
            this.redSlider.setPercentage(selectedColor.getRed() / 255);
        }
        if (initiator !== "greenSlider") {
            this.greenSlider.setPercentage(selectedColor.getGreen() / 255);
        }
        if (initiator !== "blueSlider") {
            this.blueSlider.setPercentage(selectedColor.getBlue() / 255);
        }
        if (isHSVInitiator) {
            // Take the HSV values from the fields, so we are not losing any data when converting back and forth
            if (initiator === "hueField") {
                this.hueSlider.setPercentage(this.hueField.getValue() / 360);
            }
            if (initiator === "saturationField") {
                this.saturationSlider.setPercentage(this.saturationField.getValue() / 100);
            }
            if (initiator === "lightnessField") {
                this.lightnessSlider.setPercentage(this.lightnessField.getValue() / 100);
            }
        } else {
            // Update HSV sliders with the color
            if (initiator !== "hueSlider") {
                this.hueSlider.setPercentage(selectedColor.getHue());
            }
            if (initiator !== "saturationSlider") {
                this.saturationSlider.setPercentage(selectedColor.getSaturation());
            }
            if (initiator !== "lightnessSlider") {
                this.lightnessSlider.setPercentage(selectedColor.getLightness());
            }
        }
        if (initiator !== "alphaSlider") {
            this.alphaSlider.setPercentage(selectedColor.getAlpha() / 255);
        }

        // Update fields
        if (initiator !== "redField") {
            this.redField.setText(selectedColor.getRed());
        }
        if (initiator !== "greenField") {
            this.greenField.setText(selectedColor.getGreen());
        }
        if (initiator !== "blueField") {
            this.blueField.setText(selectedColor.getBlue());
        }
        if (isHSVInitiator) {
            // Take the HSV values from the sliders, so we are not losing any data when converting back and forth
            if (initiator === "hueSlider") {
                this.hueField.setText(Math.floor(this.hueSlider.getPercentage() * 360));
            }
            if (initiator === "saturationSlider") {
                this.saturationField.setText(Math.floor(this.saturationSlider.getPercentage() * 100));
            }
            if (initiator === "lightnessSlider") {
                this.lightnessField.setText(Math.floor(this.lightnessSlider.getPercentage() * 100));
            }
        } else {
            // Update HSV fields with the color
            if (initiator !== "hueField") {
                this.hueField.setText(Math.floor(selectedColor.getHue() * 360));
            }
            if (initiator !== "saturationField") {
                this.saturationField.setText(Math.floor(selectedColor.getSaturation() * 100));
            }
            if (initiator !== "lightnessField") {
                this.lightnessField.setText(Math.floor(selectedColor.getLightness() * 100));
            }
        }
        if (initiator !== "alphaField") {
            this.alphaField.setText(selectedColor.getAlpha());
        }

        this.updating = false;
    }

    paletteColor(index) {
        let color = this.palette[index];
        return "linear-gradient(" + color.copy().setAlpha(255).toHex() + ", " + color.toHex() + ")"
    }
}