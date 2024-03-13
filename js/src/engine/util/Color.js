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
}

Color.WHITE = new Color(255, 255, 255);