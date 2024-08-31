class ColorCircleItem extends Item {

    constructor(id) {
        super(id);

        this.changeCallback = null;
        this.canvas = null;
        this.cursor = null;
        this.color = Color.WHITE;
    }

    buildElement() {
        // Color circle
        let colorCircle = document.createElement("div");
        colorCircle.classList.add("color-circle");
        {
            // Canvas
            this.canvas = document.createElement("canvas");
            this.canvas.classList.add("canvas");
            this.canvas.width = 141; // Note: Also adjust size in css
            this.canvas.height = 141;
            this.registerMouseEventsCombined(this.canvas, (mouseX, mouseY, button) => {
                this.onMouseEvent(mouseX, mouseY, button);
            });
            this.renderCircle(this.canvas);
            colorCircle.appendChild(this.canvas);

            // Cursor
            this.cursor = document.createElement("div");
            this.cursor.classList.add("cursor");
            this.cursor.style.left = "50%";
            this.cursor.style.top = "50%";
            colorCircle.appendChild(this.cursor);
        }
        return colorCircle;
    }

    onMouseEvent(mouseX, mouseY, button) {
        let rect = this.canvas.getBoundingClientRect();
        let x = mouseX - rect.left;
        let y = mouseY - rect.top;

        let color = this.getColorAtCircle(x, y, false);
        if (color === null) {
            let color = this.getColorAtCircle(x, y, true);
            this.setColor(color);
        } else {
            this.setColor(color);

            this.cursor.style.left = x + "px";
            this.cursor.style.top = y + "px";
        }
    }

    setColor(color) {
        if (this.color === color) {
            return;
        }

        // Update cursor position
        let position = this.getPositionOfColor(color);
        this.cursor.style.left = position.x + "px";
        this.cursor.style.top = position.y + "px";

        // Update cursor color
        let cursorColor = this.getColorAtCircle(position.x, position.y, true);
        this.cursor.style.backgroundColor = cursorColor.toHex();

        this.color = color;

        if (this.changeCallback !== null) {
            this.changeCallback(color);
        }
    }

    setChangeCallback(callback) {
        this.changeCallback = callback;
    }

    getColor() {
        return this.color;
    }

    renderCircle(canvas) {
        let ctx = canvas.getContext("2d");
        let radius = canvas.width / 2;

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let x = (i / 4) % canvas.width;
            let y = (i / 4) / canvas.width;

            let angle = Math.atan2(y - radius, x - radius);
            let distance = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));

            if (distance <= radius) {
                let hue = angle / (2 * Math.PI);
                let saturation = distance / radius;
                let lightness = 1 - Math.min(distance / (radius * 1.7), 0.5);

                let color = Color.fromHSL(hue, saturation, lightness);
                let alpha = Math.min(radius - distance, 1) * 255;

                data[i] = color.getRed();
                data[i + 1] = color.getGreen();
                data[i + 2] = color.getBlue();
                data[i + 3] = alpha;
            }
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.putImageData(imageData, 0, 0);
    }

    getColorAtCircle(x, y, clamp = true) {
        let radius = this.canvas.width / 2;

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

        if (hue < 0) {
            hue += 1;
        }

        return Color.fromHSL(hue, saturation, lightness, this.color.getAlpha());
    }

    getPositionOfColor(color) {
        let radius = this.canvas.width / 2;
        let hue = color.getHue() * 2 * Math.PI;
        let saturation = color.getSaturation();

        let angle = hue;
        let distance = saturation * radius;

        let x = radius + distance * Math.cos(angle);
        let y = radius + distance * Math.sin(angle);

        return {x: x, y: y};
    }
}