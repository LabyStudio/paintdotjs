class ColorsForm extends Form {

    constructor() {
        super("colorsForm");
    }

    initialize(window) {
        super.initialize(window);

        window.setSize(223, 261);
        window.setPosition(5, this.app.getViewBounds().getBottom() - window.getHeight() - 20 - 5);
    }

    buildContent() {
        let grid = super.buildContent();
        grid.id = "colorsForm";

        // Current colors
        let currentColors = document.createElement("div");
        currentColors.id = "currentColors";
        {
            // Left color
            let leftColor = document.createElement("div")
            leftColor.classList.add("currentColor");
            leftColor.id = "leftColor";
            leftColor.style.backgroundColor = "black";
            currentColors.appendChild(leftColor);

            // Right color
            let rightColor = document.createElement("div");
            rightColor.classList.add("currentColor");
            rightColor.id = "rightColor";
            rightColor.style.backgroundColor = "white";
            currentColors.appendChild(rightColor);

            // Swap colors button
            let swapColorsButton = document.createElement("img");
            swapColorsButton.id = "swapColorsButton";
            swapColorsButton.src = "assets/icons/swap_icon.png";
            swapColorsButton.onclick = () => {
            };
            currentColors.appendChild(swapColorsButton)

            // Black and white button
            let blackAndWhiteButton = document.createElement("img");
            blackAndWhiteButton.id = "blackAndWhiteButton";
            blackAndWhiteButton.src = "assets/icons/black_and_white_icon.png";
            blackAndWhiteButton.onclick = () => {
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
            let canvas = document.createElement("canvas");
            canvas.id = "colorCircleCanvas";
            this.renderPalette(canvas);
            colorCircle.appendChild(canvas);

            // Cursor
            let cursor = document.createElement("div");
            cursor.id = "colorCircleCursor";
            cursor.style.left = "50%";
            cursor.style.top = "50%";
            colorCircle.appendChild(cursor);
        }
        grid.appendChild(colorCircle);

        // Color settings strip
        let colorSettingsStrip = document.createElement("div");
        colorSettingsStrip.id = "colorSettingsStrip";
        colorSettingsStrip.classList.add("strip");
        {
            // Color add
            let colorAdd = new ColorAddItem();
            colorSettingsStrip.appendChild(colorAdd.buildElement());

            // Swatch
            let swatch = new SwatchItem();
            colorSettingsStrip.appendChild(swatch.buildElement());
        }
        grid.appendChild(colorSettingsStrip);


        return grid;
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

                let rgb = Color.hslToRgb(hue, saturation, lightness);
                let alpha = Math.min((radius - distance) / 2, 1) * 255;

                data[i] = rgb[0];
                data[i + 1] = rgb[1];
                data[i + 2] = rgb[2];
                data[i + 3] = alpha;
            }
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.putImageData(imageData, 0, 0);

    }


}