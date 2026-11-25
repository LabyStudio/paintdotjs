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
 * The interface design and behavior target Paint.NET 5.2+.
 * Licensed under LICENSE.md. See NOTICE.md for full attribution.
 */

class BmpEncoder {
    static CONTROLS = [
        {key: "bitDepth", label: "Bit Depth", type: "select", defaultValue: "auto",
            choices: [{value: "auto", label: "Auto-detect"}, ...[32, 24, 8, 4, 1].map(depth => ({
                value: String(depth), label: depth + "-bit"
            }))]},
        {key: "quantization", label: "Quantization algorithm", type: "select", defaultValue: "octree",
            choices: [{value: "octree", label: "Octree"}, {value: "medianCut", label: "Median Cut"}],
            enabled: options => this.isIndexed(options.bitDepth)},
        {key: "ditherLevel", label: "Dithering level", type: "slider", min: 0, max: 8, step: 1, defaultValue: 7,
            enabled: options => this.isIndexed(options.bitDepth)}
    ];

    static isIndexed(depth) {
        return ["1", "4", "8"].includes(String(depth));
    }

    static colorAt(pixels, offset) {
        return pixels[offset] << 16 | pixels[offset + 1] << 8 | pixels[offset + 2];
    }

    static palette(pixels, limit) {
        let colors = new Map();
        for (let offset = 0; offset < pixels.length; offset += 4) {
            let color = this.colorAt(pixels, offset);
            if (!colors.has(color)) {
                if (colors.size === limit) {
                    return null;
                }
                colors.set(color, colors.size);
            }
        }
        return colors;
    }

    static stride(width, depth) {
        return Math.ceil(width * depth / 32) * 4;
    }

    static autoDepth(image) {
        for (let offset = 3; offset < image.data.length; offset += 4) {
            if (image.data[offset] !== 255) {
                return 32;
            }
        }
        let palette = this.palette(image.data, 256);
        if (palette === null) {
            return 24;
        }
        let depth = palette.size <= 16 ? 4 : 8;
        if (image.width * image.height > 262144) {
            return palette.size <= 2 ? 1 : depth;
        }
        let indexedSize = this.stride(image.width, depth) * image.height + palette.size * 4;
        return indexedSize < this.stride(image.width, 24) * image.height ? depth : 24;
    }

    static async encode(canvas, options = {}) {
        let depth = Number(options.bitDepth);
        let image;
        let flattened;
        if ([24, 8, 4, 1].includes(depth)) {
            flattened = ImageEncoder.flatten(canvas);
            image = ImageEncoder.getPixels(flattened);
        } else {
            image = ImageEncoder.getPixels(canvas);
            depth = depth === 32 ? 32 : this.autoDepth(image);
        }

        let pixels = image.data;
        let palette = null;
        if (depth <= 8) {
            let limit = 2 ** depth;
            palette = this.palette(pixels, limit);
            if (palette === null) {
                let dithering = Utility.clamp(Number(options.ditherLevel ?? 7), 0, 8);
                if (options.quantization === "medianCut") {
                    pixels = BitmapEffectEngine.quantize(image, image.width, image.height, {
                        colors: limit, dithering, alphaThreshold: 0
                    }).data;
                } else {
                    let png = await ImageEncoder.canvasToBlob(flattened, "image/png");
                    pixels = await window.portableImageCodec.quantize(
                        new Uint8Array(await png.arrayBuffer()), limit, dithering);
                }
                palette = this.palette(pixels, limit);
                if (palette === null) {
                    throw new Error("Could not reduce the image to the selected BMP bit depth.");
                }
            }
        }

        let headerSize = depth === 32 ? 124 : 40;
        let offset = 14 + headerSize + (palette?.size || 0) * 4;
        let stride = this.stride(image.width, depth);
        let bytes = new Uint8Array(offset + stride * image.height);
        let view = new DataView(bytes.buffer);
        bytes.set([0x42, 0x4d]);
        view.setUint32(2, bytes.length, true);
        view.setUint32(10, offset, true);
        view.setUint32(14, headerSize, true);
        view.setInt32(18, image.width, true);
        view.setInt32(22, image.height, true);
        view.setUint16(26, 1, true);
        view.setUint16(28, depth, true);
        view.setUint32(34, stride * image.height, true);
        if (depth === 32) {
            view.setUint32(30, 3, true); // BI_BITFIELDS
            view.setUint32(54, 0x00ff0000, true);
            view.setUint32(58, 0x0000ff00, true);
            view.setUint32(62, 0x000000ff, true);
            view.setUint32(66, 0xff000000, true);
            view.setUint32(70, 0x73524742, true); // LCS_sRGB
            view.setUint32(122, 4, true); // LCS_GM_IMAGES
        }
        if (palette !== null) {
            view.setUint32(46, palette.size, true);
            for (let [color, index] of palette) {
                view.setUint32(54 + index * 4, color, true);
            }
        }
        for (let y = 0; y < image.height; ++y) {
            let row = offset + (image.height - y - 1) * stride;
            for (let x = 0; x < image.width; ++x) {
                let source = (y * image.width + x) * 4;
                let bit = x * depth;
                let target = row + Math.floor(bit / 8);
                if (palette !== null) {
                    let index = palette.get(this.colorAt(pixels, source));
                    bytes[target] |= index << (8 - depth - bit % 8);
                } else {
                    bytes[target] = pixels[source + 2];
                    bytes[target + 1] = pixels[source + 1];
                    bytes[target + 2] = pixels[source];
                    if (depth === 32) {
                        bytes[target + 3] = pixels[source + 3];
                    }
                }
            }
        }
        return new Blob([bytes], {type: "image/bmp"});
    }
}
