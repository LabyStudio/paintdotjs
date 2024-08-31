class Color {

    constructor(red, green, blue, alpha = 255) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    getRed() {
        return this.red;
    }

    getGreen() {
        return this.green;
    }

    getBlue() {
        return this.blue;
    }

    getAlpha() {
        return this.alpha;
    }

    getHue() {
        let red = this.red / 255;
        let green = this.green / 255;
        let blue = this.blue / 255;

        let max = Math.max(red, green, blue);
        let min = Math.min(red, green, blue);
        if (max === min) {
            return 0;
        }

        let d = max - min;
        let hue;
        switch (max) {
            case red:
                hue = (green - blue) / d + (green < blue ? 6 : 0);
                break;
            case green:
                hue = (blue - red) / d + 2;
                break;
            case blue:
                hue = (red - green) / d + 4;
                break;
        }
        return hue / 6;

    }

    getSaturation() {
        let red = this.red / 255;
        let green = this.green / 255;
        let blue = this.blue / 255;

        let max = Math.max(red, green, blue);
        let min = Math.min(red, green, blue);
        if (max === min) {
            return 0;
        }

        let d = max - min;
        let lightness = (max + min) / 2;
        return lightness > 0.5 ? d / (2 - max - min) : d / (max + min);
    }

    getLightness() {
        let red = this.red / 255;
        let green = this.green / 255;
        let blue = this.blue / 255;

        let max = Math.max(red, green, blue);
        let min = Math.min(red, green, blue);
        return (max + min) / 2;
    }

    toHex() {
        let red = this.red.toString(16).padStart(2, "0");
        let green = this.green.toString(16).padStart(2, "0");
        let blue = this.blue.toString(16).padStart(2, "0");
        let alpha = this.alpha.toString(16).padStart(2, "0");
        return "#" + red + green + blue + alpha;
    }

    toPacked() {
        return (this.alpha << 24) | (this.blue << 16) | (this.green << 8) | this.red;
    }

    setRed(red) {
        this.red = red;
        return this;
    }

    setGreen(green) {
        this.green = green;
        return this;
    }

    setBlue(blue) {
        this.blue = blue;
        return this;
    }

    setAlpha(alpha) {
        this.alpha = alpha;
        return this;
    }

    setHue(hue) {
        let saturation = this.getSaturation();
        let lightness = this.getLightness();
        let color = Color.fromHSL(hue, saturation, lightness);
        this.red = color.getRed();
        this.green = color.getGreen();
        this.blue = color.getBlue();
        return this;
    }

    setSaturation(saturation) {
        let hue = this.getHue();
        let lightness = this.getLightness();
        let color = Color.fromHSL(hue, saturation, lightness);
        this.red = color.getRed();
        this.green = color.getGreen();
        this.blue = color.getBlue();
        return this;
    }

    setLightness(lightness) {
        let hue = this.getHue();
        let saturation = this.getSaturation();
        let color = Color.fromHSL(hue, saturation, lightness);
        this.red = color.getRed();
        this.green = color.getGreen();
        this.blue = color.getBlue();
        return this;
    }

    copy() {
        return new Color(this.red, this.green, this.blue, this.alpha);
    }

    static fromHex(hex) {
        let red = parseInt(hex.substring(1, 3), 16);
        let green = parseInt(hex.substring(3, 5), 16);
        let blue = parseInt(hex.substring(5, 7), 16);
        return Color.fromRGBA(red, green, blue);
    }

    static fromPacked(packed) {
        let red = (packed & 0xFF);
        let green = (packed >> 8) & 0xFF;
        let blue = (packed >> 16) & 0xFF;
        let alpha = (packed >> 24) & 0xFF;
        return Color.fromRGBA(red, green, blue, alpha);
    }

    static fromRGB(red, green, blue) {
        return Color.fromRGBA(red, green, blue, 255);
    }

    static fromRGBA(red, green, blue, alpha) {
        return new Color(red, green, blue, alpha);
    }

    static fromHSL(hue, saturation, lightness, alpha = 255) {
        let red, green, blue;

        if (saturation === 0) {
            red = green = blue = lightness;
        } else {
            let hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            let q = lightness < 0.5
                ? lightness * (1 + saturation)
                : lightness + saturation - lightness * saturation;
            let p = 2 * lightness - q;

            red = hue2rgb(p, q, hue + 1 / 3);
            green = hue2rgb(p, q, hue);
            blue = hue2rgb(p, q, hue - 1 / 3);
        }


        red = MathHelper.clamp(Math.round(red * 255), 0, 255);
        green = MathHelper.clamp(Math.round(green * 255), 0, 255);
        blue = MathHelper.clamp(Math.round(blue * 255), 0, 255);

        return new Color(red, green, blue, alpha);
    }
}

Color.WHITE = Color.fromRGB(255, 255, 255);
Color.BLACK = Color.fromRGB(0, 0, 0);