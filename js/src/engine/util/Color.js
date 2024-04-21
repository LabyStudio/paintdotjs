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

    static hslToRgb(h, s, l) {
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

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}

Color.WHITE = new Color(255, 255, 255);