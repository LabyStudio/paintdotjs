/*
 * paint.js, an unofficial JavaScript port of Paint.NET 3.36.7
 *
 * Original Paint.NET source:
 * Copyright (C) dotPDN LLC, Rick Brewster, and contributors.
 *
 * JavaScript port and port-specific changes:
 * Copyright (C) 2024-present LabyStudio.
 * https://github.com/LabyStudio
 *
 * The interface design and behavior target Paint.NET 5.1.12+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class PluginPixels {

    static selectionBounds(mask, width, height) {
        if (!mask) {
            return {x: 0, y: 0, width, height};
        }
        let left = width, top = height, right = 0, bottom = 0;
        for (let i = 0; i < mask.length; ++i) {
            if (mask[i]) {
                let x = i % width, y = Math.floor(i / width);
                left = Math.min(left, x);
                top = Math.min(top, y);
                right = Math.max(right, x + 1);
                bottom = Math.max(bottom, y + 1);
            }
        }
        return {x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top)};
    }

    // Coordinates outside the image are clamped to the nearest edge pixel.
    static sample(source, width, height, x, y) {
        let offset = (Math.max(0, Math.min(height - 1, Math.round(y))) * width
            + Math.max(0, Math.min(width - 1, Math.round(x)))) * 4;
        return Array.from(source.subarray(offset, offset + 4));
    }

    static rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
        let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6
            : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
        return [(hue * 60 + 360) % 360, max === 0 ? 0 : delta / max, max];
    }

    static hsvToRgb(h, s, v) {
        let hue = ((h % 360) + 360) % 360 / 60;
        let chroma = v * s, x = chroma * (1 - Math.abs(hue % 2 - 1)), m = v - chroma;
        let color = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x],
            [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][Math.floor(hue)];
        return color.map(value => Math.round((value + m) * 255));
    }

    static convolve(source, width, height, kernel, {divisor = 1, bias = 0, preserveAlpha = true} = {}) {
        let size = Math.sqrt(kernel.length);
        if (!Number.isInteger(size) || size % 2 !== 1 || size > 31 || !Number.isFinite(divisor) || divisor === 0) {
            throw new Error("Convolution requires an odd square kernel (up to 31×31) and a nonzero divisor.");
        }
        let destination = new Uint8ClampedArray(source);
        let radius = Math.floor(size / 2);
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                for (let channel = 0; channel < (preserveAlpha ? 3 : 4); ++channel) {
                    let sum = 0;
                    for (let ky = 0; ky < size; ++ky) {
                        for (let kx = 0; kx < size; ++kx) {
                            let sx = Math.max(0, Math.min(width - 1, x + kx - radius));
                            let sy = Math.max(0, Math.min(height - 1, y + ky - radius));
                            sum += source[(sy * width + sx) * 4 + channel] * kernel[ky * size + kx];
                        }
                    }
                    destination[(y * width + x) * 4 + channel] = sum / divisor + bias;
                }
            }
        }
        return destination;
    }
}
