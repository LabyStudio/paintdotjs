class ColorsForm extends Form {

    constructor() {
        super("colorsForm");

        this.mainColor = 0xFF000000;
        this.secondaryColor = 0xFFFFFFFF;
        this.selectedIsPrimary = true;

        this.palette = [];

        // Generate palette
        for (let row = 0; row < 14; row++) {
            if (row === 0) {
                this.palette.push(0xFF000000);
                this.palette.push(0xFF404040);
            } else {
                this.palette.push(0xFFFFFFFF);
                this.palette.push(0xFF808080);
            }
            for (let column = 0; column < 14; column++) {
                let hue = column / 14;
                let saturation = 1;
                let lightness = row === 0 ? 0.5 : 0.25;
                let packed = Color.hslToRgb(hue, saturation, lightness);
                this.palette.push(packed);
            }
        }

        this.mainColorElement = null;
        this.secondaryColorElement = null;
        this.circleCanvasElement = null;
        this.cursorAddElement = null;
        this.cursorElement = null;

        document.addEventListener("mouseup", () => {
            this.dragging = false;
        });
        document.addEventListener("mousemove", event => {
            if (!this.dragging) {
                return;
            }

            let rect = this.circleCanvasElement.getBoundingClientRect();
            let x = event.clientX - rect.left;
            let y = event.clientY - rect.top;

            let color = this.getColorAtCircle(this.circleCanvasElement, x, y, true);
            if (color !== null) {
                this.setSelectedColor(color);
            }

            // Update cursor position directly
            if (this.getColorAtCircle(this.circleCanvasElement, x, y, false) !== null) {
                this.cursorElement.style.left = x + "px";
                this.cursorElement.style.top = y + "px";
            }
        });
    }

    initialize(window) {
        super.initialize(window);

        window.setSize(209, 248);
        window.setPosition(5, this.app.getViewBounds().getBottom() - window.getHeight() - 20 - 5);
    }

    buildContent() {
        let grid = super.buildContent();
        grid.id = "colorsForm";

        // Current colors
        let currentColors = document.createElement("div");
        currentColors.id = "currentColors";
        {
            // Main color
            this.mainColorElement = document.createElement("div")
            this.mainColorElement.classList.add("currentColor");
            this.mainColorElement.id = "mainColor";
            this.mainColorElement.onclick = () => {
                this.setSelectedIsPrimary(true);
            }
            {
                // Selected color indicator
                let selectedColorIndicator = document.createElement("div");
                selectedColorIndicator.classList.add("selectedColorIndicator");
                this.mainColorElement.appendChild(selectedColorIndicator);
            }
            currentColors.appendChild(this.mainColorElement);

            // Secondary color
            this.secondaryColorElement = document.createElement("div");
            this.secondaryColorElement.classList.add("currentColor");
            this.secondaryColorElement.id = "secondaryColor";
            this.secondaryColorElement.onclick = () => {
                this.setSelectedIsPrimary(false);
            }
            {
                // Selected color indicator
                let selectedColorIndicator = document.createElement("div");
                selectedColorIndicator.classList.add("selectedColorIndicator");
                this.secondaryColorElement.appendChild(selectedColorIndicator);
            }
            currentColors.appendChild(this.secondaryColorElement);

            // Swap colors button
            let swapColorsButton = document.createElement("img");
            swapColorsButton.id = "swapColorsButton";
            swapColorsButton.src = "assets/icons/swap_icon.png";
            swapColorsButton.onclick = () => {
                let temp = this.mainColor;
                this.setMainColor(this.secondaryColor);
                this.setSecondaryColor(temp);
                this.updateCursor();
            };
            currentColors.appendChild(swapColorsButton)

            // Black and white button
            let blackAndWhiteButton = document.createElement("img");
            blackAndWhiteButton.id = "blackAndWhiteButton";
            blackAndWhiteButton.src = "assets/icons/black_and_white_icon.png";
            blackAndWhiteButton.onclick = () => {
                this.setMainColor(0xFF000000);
                this.setSecondaryColor(0xFFFFFFFF);
                this.updateCursor();
            };
            currentColors.appendChild(blackAndWhiteButton);
        }
        grid.appendChild(currentColors);

        // More/Less button
        let moreLessButton = document.createElement("button");
        moreLessButton.id = "moreLessButton";
        moreLessButton.textContent = i18n("colorsForm.moreLessButton.text.more") + " >>";
        moreLessButton.onclick = () => {
        };
        grid.appendChild(moreLessButton);

        // Color circle
        let colorCircle = document.createElement("div");
        colorCircle.id = "colorCircle";
        {
            // Canvas
            this.circleCanvasElement = document.createElement("canvas");
            this.circleCanvasElement.id = "colorCircleCanvas";
            this.circleCanvasElement.onmousedown = event => {
                let rect = this.circleCanvasElement.getBoundingClientRect();
                let x = event.clientX - rect.left;
                let y = event.clientY - rect.top;

                let color = this.getColorAtCircle(this.circleCanvasElement, x, y, false);
                if (color !== null) {
                    this.setSelectedColor(color);

                    // Update cursor position directly
                    this.cursorElement.style.left = x + "px";
                    this.cursorElement.style.top = y + "px";
                }
                this.dragging = true;
            }
            this.renderPalette(this.circleCanvasElement);
            colorCircle.appendChild(this.circleCanvasElement);

            // Cursor
            this.cursorElement = document.createElement("div");
            this.cursorElement.id = "colorCircleCursor";
            this.cursorElement.style.left = "50%";
            this.cursorElement.style.top = "50%";
            colorCircle.appendChild(this.cursorElement);
        }
        grid.appendChild(colorCircle);

        // Color settings strip
        let colorSettingsStrip = document.createElement("div");
        colorSettingsStrip.id = "colorSettingsStrip";
        colorSettingsStrip.classList.add("strip");
        {
            // Color add
            this.colorAddElement = new ColorAddItem();
            colorSettingsStrip.appendChild(this.colorAddElement.buildElement());

            // Swatch
            let swatch = new SwatchItem();
            colorSettingsStrip.appendChild(swatch.buildElement());
        }
        grid.appendChild(colorSettingsStrip);

        // Color palette
        let colorPalette = document.createElement("div");
        colorPalette.id = "colorPalette";
        {
            for (let i = 0; i < 32; i++) {
                let colorElement = document.createElement("div");
                colorElement.classList.add("color");
                colorElement.style.backgroundColor = Color.packed2Hex(this.palette[i]);
                colorElement.onmousedown = event => {
                    let isLeftClick = event.button === 0;
                    if (isLeftClick) {
                        this.setSelectedColor(this.palette[i]);
                    } else {
                        this.setNotSelectedColor(this.palette[i]);
                    }
                }
                colorPalette.appendChild(colorElement);
            }
        }
        grid.appendChild(colorPalette);

        this.updateCursor();

        return grid;
    }

    setMainColor(color) {
        this.mainColor = color;
        this.mainColorElement.style.setProperty('--selected-color', Color.packed2Hex(color));
    }

    setSecondaryColor(color) {
        this.secondaryColor = color;
        this.secondaryColorElement.style.setProperty('--selected-color', Color.packed2Hex(color));
    }

    getSelectedColor() {
        return this.selectedIsPrimary ? this.mainColor : this.secondaryColor;
    }

    setSelectedColor(color) {
        if (this.selectedIsPrimary) {
            this.setMainColor(color);
        } else {
            this.setSecondaryColor(color);
        }
        this.updateCursor();
    }

    setNotSelectedColor(color) {
        if (this.selectedIsPrimary) {
            this.setSecondaryColor(color);
        } else {
            this.setMainColor(color);
        }
    }

    setSelectedIsPrimary(isPrimary) {
        this.selectedIsPrimary = isPrimary;
        this.updateCursor();
    }

    updateCursor() {
        // Update cursor position
        let selectedColor = this.getSelectedColor();
        let position = this.getPositionOfColor(this.circleCanvasElement, selectedColor);
        this.cursorElement.style.left = position.x + "px";
        this.cursorElement.style.top = position.y + "px";

        // Update cursor color
        let cursorColor = this.getColorAtCircle(this.circleCanvasElement, position.x, position.y, true);
        this.cursorElement.style.backgroundColor = Color.packed2Hex(cursorColor);

        // Update color add item
        this.colorAddElement.setColor(selectedColor);

        // Update selected color indicators
        let isPrimary = this.selectedIsPrimary;
        this.mainColorElement.children[0].style.opacity = isPrimary ? "1" : "0";
        this.mainColorElement.style.backgroundColor = isPrimary ? '#FFF' : "var(--selected-color)";
        this.mainColorElement.style.setProperty('--indicator-active', isPrimary ? "1" : "0");
        this.secondaryColorElement.children[0].style.opacity = isPrimary ? "0" : "1";
        this.secondaryColorElement.style.backgroundColor = isPrimary ? "var(--selected-color)" : '#FFF';
        this.secondaryColorElement.style.setProperty('--indicator-active', isPrimary ? "0" : "1");
    }

    renderPalette(canvas) {
        let ctx = canvas.getContext("2d");
        let radius = canvas.width / 2;

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let x = (i / 4) % canvas.width;
            let y = (i / 4) / canvas.height;

            let angle = Math.atan2(y - radius, x - radius);
            let distance = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));

            if (distance <= radius) {
                let hue = angle / (2 * Math.PI);
                let saturation = distance / radius;
                let lightness = 1 - Math.min(distance / (radius * 1.7), 0.5);

                let rgba = Color.hslToRgb(hue, saturation, lightness);
                let alpha = Math.min((radius - distance) / 2, 1) * 255;

                data[i] = rgba & 0xFF;
                data[i + 1] = (rgba >> 8) & 0xFF;
                data[i + 2] = (rgba >> 16) & 0xFF;
                data[i + 3] = alpha;
            }
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.putImageData(imageData, 0, 0);
    }


    getColorAtCircle(canvas, x, y, clamp = true) {
        let radius = canvas.width / 4 - 4;

        let angle = Math.atan2(y - radius, x - radius);
        let distance = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));
        if (distance > radius) {
            if (clamp) {
                distance = radius;
            } else {
                return null;
            }
        }

        let hue = angle / (2 * Math.PI);
        let saturation = distance / radius;
        let lightness = 1 - Math.min(distance / (radius * 1.7), 0.5);

        return Color.hslToRgb(hue, saturation, lightness);
    }

    getPositionOfColor(canvas, color) {
        let radius = canvas.width / 4 - 4;

        let red = (color >> 16) & 0xFF;
        let green = (color >> 8) & 0xFF;
        let blue = color & 0xFF;

        let hsl = Color.rgbToHsl(red, green, blue);
        let hue = hsl[0] * 2 * Math.PI + 0.5;
        let saturation = hsl[1];
        let lightness = hsl[2];

        let angle = hue;
        let distance = saturation * radius;

        let x = radius - distance * Math.sin(angle);
        let y = radius - distance * Math.cos(angle);

        return {x: x, y: y};
    }
}