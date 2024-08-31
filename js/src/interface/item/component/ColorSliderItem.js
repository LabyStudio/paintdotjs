class ColorSliderItem extends Item {

    constructor(id, colorProvider = _ => 0) {
        super(id);
        this.colorProvider = colorProvider;

        this.changeCallback = null;
        this.canvas = null;
        this.cursor = null;
        this.moveEvent = null;
        this.percentage = 0;
    }

    buildElement() {
        // Slider
        let slider = document.createElement("div");
        slider.classList.add("color-slider");
        {
            // Canvas
            this.canvas = document.createElement("canvas");
            this.canvas.classList.add("canvas");
            this.canvas.width = 65;
            this.canvas.height = 10;
            this.registerMouseEventsCombined(this.canvas, (mouseX, mouseY, button) => {
                this.onMouseEvent(mouseX);
            });
            this.renderSpectrum(this.canvas);
            slider.appendChild(this.canvas);

            // Cursor
            this.cursor = document.createElement("div");
            this.cursor.classList.add("cursor");
            this.cursor.style.left = "0px";
            this.registerMouseEventsCombined(this.cursor, (mouseX, mouseY, button) => {
                this.onMouseEvent(mouseX);
            });
            slider.appendChild(this.cursor);
        }
        return slider;
    }

    onMouseEvent(mouseX) {
        let rect = this.canvas.getBoundingClientRect();
        let x = mouseX - rect.left;
        let percentage = Math.min(1, Math.max(0, x / rect.width));
        this.setPercentage(percentage);
    }

    setPercentage(percentage) {
        if (percentage === this.percentage) {
            return;
        }
        this.percentage = percentage;
        this.cursor.style.left = (percentage * 100) + "%";
        this.onChange(percentage);
    }

    getPercentage() {
        return this.percentage;
    }

    renderSpectrum(canvas) {
        let ctx = canvas.getContext("2d");
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let x = (i / 4) % canvas.width;
            let y = Math.floor((i / 4) / canvas.width);
            let color = this.colorProvider(x / canvas.width);
            let minOpacity = 1 - y / canvas.height;

            data[i] = color.getRed();
            data[i + 1] = color.getGreen();
            data[i + 2] = color.getBlue();
            data[i + 3] = Math.max(color.getAlpha(), minOpacity * 255);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.putImageData(imageData, 0, 0);
    }

    onChange(value) {
        if (this.changeCallback !== null) {
            this.changeCallback(value);
        }
    }

    isImplemented() {
        return true;
    }

    isClickable() {
        return false;
    }

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

    static rangeProvider(fromColor, toColor) {
        return v => {
            let r1 = fromColor.getRed();
            let g1 = fromColor.getGreen();
            let b1 = fromColor.getBlue();
            let a1 = fromColor.getAlpha();

            let r2 = toColor.getRed();
            let g2 = toColor.getGreen();
            let b2 = toColor.getBlue();
            let a2 = toColor.getAlpha();

            let r = Math.round(r1 + v * (r2 - r1));
            let g = Math.round(g1 + v * (g2 - g1));
            let b = Math.round(b1 + v * (b2 - b1));
            let a = Math.round(a1 + v * (a2 - a1));

            return Color.fromRGBA(r, g, b, a);
        }
    }
}