class Color {

    constructor(red, green, blue, alpha = 255) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    toHex() {
        let red = this.red.toString(16).padStart(2, "0");
        let green = this.green.toString(16).padStart(2, "0");
        let blue = this.blue.toString(16).padStart(2, "0");
        let alpha = this.alpha.toString(16).padStart(2, "0");
        return "#" + red + green + blue + alpha;
    }

    static fromHex(hex) {
        let red = parseInt(hex.substring(1, 3), 16);
        let green = parseInt(hex.substring(3, 5), 16);
        let blue = parseInt(hex.substring(5, 7), 16);
        return new Color(red, green, blue);
    }

    static fromRGB(red, green, blue) {
        return new Color(red, green, blue);
    }

    static fromRGBA(red, green, blue, alpha) {
        return new Color(red, green, blue, alpha);
    }

    static hslToRgb(h, s, l, alpha = 255) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            let hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }


        r = MathHelper.clamp(Math.round(r * 255), 0, 255);
        g = MathHelper.clamp(Math.round(g * 255), 0, 255);
        b = MathHelper.clamp(Math.round(b * 255), 0, 255);

        return this.rgba2Packed(r, g, b, alpha);
    }

    static rgbToHsl(red, green, blue) {
        let r = red / 255;
        let g = green / 255;
        let b = blue / 255;

        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);

        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }

            h /= 6;
        }

        return [h, s, l];
    }

    static rgba2Packed(red, green, blue, alpha) {
        return (alpha << 24) | (blue << 16) | (green << 8) | red;
    }

    static packed2Hex(packed) {
        let red = (packed & 0xFF);
        let green = (packed >> 8) & 0xFF;
        let blue = (packed >> 16) & 0xFF;
        let alpha = (packed >> 24) & 0xFF;
        return "#" + red.toString(16).padStart(2, "0")
            + green.toString(16).padStart(2, "0")
            + blue.toString(16).padStart(2, "0")
            + alpha.toString(16).padStart(2, "0");
    }
}

Color.WHITE = new Color(255, 255, 255);