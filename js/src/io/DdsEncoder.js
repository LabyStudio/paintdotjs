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

class DdsEncoder {
    // Packed formats list the RGB and alpha masks in channel order.
    static FORMATS = [
        {value: "bc1", label: "BC1 (Linear, DXT1)", compression: "dxt1"},
        {value: "bc3", label: "BC3 (Linear, DXT5)", compression: "dxt5"},
        {value: "bgra8", label: "B8G8R8A8 (Linear, A8R8G8B8)", bits: 32,
            masks: [0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000]},
        {value: "bgrx8", label: "B8G8R8X8 (Linear, X8R8G8B8)", bits: 32,
            masks: [0x00ff0000, 0x0000ff00, 0x000000ff, 0]},
        {value: "rgba8", label: "R8G8B8A8 (Linear, A8B8G8R8)", bits: 32,
            masks: [0x000000ff, 0x0000ff00, 0x00ff0000, 0xff000000]},
        {value: "rgbx8", label: "R8G8B8X8 (Linear, X8B8G8R8)", bits: 32,
            masks: [0x000000ff, 0x0000ff00, 0x00ff0000, 0]},
        {value: "bgr5a1", label: "B5G5R5A1 (Linear, A1R5G5B5)", bits: 16,
            masks: [0x7c00, 0x03e0, 0x001f, 0x8000]},
        {value: "bgra4", label: "B4G4R4A4 (Linear, A4R4G4B4)", bits: 16,
            masks: [0x0f00, 0x00f0, 0x000f, 0xf000]},
        {value: "bgr565", label: "B5G6R5 (Linear, R5G6B5)", bits: 16,
            masks: [0xf800, 0x07e0, 0x001f, 0]},
        {value: "bgr8", label: "B8G8R8 (Linear, R8G8B8)", bits: 24,
            masks: [0x00ff0000, 0x0000ff00, 0x000000ff, 0]}
    ];

    static CONTROLS = [{
        type: "select",
        key: "ddsFormat",
        label: "DDS Format",
        defaultValue: "bc1",
        choices: this.FORMATS.map(({value, label}) => ({value, label}))
    }];

    static async encode(canvas, options = {}) {
        let format = this.FORMATS.find(choice => choice.value === (options.ddsFormat ?? "rgba8"));
        if (!format) {
            throw new Error("Unsupported DDS pixel format: " + options.ddsFormat);
        }
        if (!format.compression) {
            return this.encodePacked(ImageEncoder.getPixels(canvas), format);
        }
        if (!window.portableImageCodec?.encode) {
            throw new Error("DDS compression is not available");
        }
        let png = await ImageEncoder.canvasToBlob(canvas, "image/png");
        let bytes = await window.portableImageCodec.encode(
            new Uint8Array(await png.arrayBuffer()), "dds", 100, {compression: format.compression});
        if (format.compression === "dxt1") {
            this.applyBc1Alpha(bytes, ImageEncoder.getPixels(canvas));
        }
        return new Blob([bytes], {type: "image/vnd-ms.dds"});
    }

    static encodePacked(image, format) {
        const headerSize = 128;
        let bytesPerPixel = format.bits / 8;
        let pitch = image.width * bytesPerPixel;
        let bytes = new Uint8Array(headerSize + pitch * image.height);
        let view = new DataView(bytes.buffer);
        bytes.set([0x44, 0x44, 0x53, 0x20]);
        view.setUint32(4, 124, true);
        view.setUint32(8, 0x100f, true); // Caps, dimensions, pitch and pixel format.
        view.setUint32(12, image.height, true);
        view.setUint32(16, image.width, true);
        view.setUint32(20, pitch, true);
        view.setUint32(76, 32, true);
        view.setUint32(80, format.masks[3] ? 0x41 : 0x40, true);
        view.setUint32(88, format.bits, true);
        for (let channel = 0; channel < 4; ++channel) {
            view.setUint32(92 + 4 * channel, format.masks[channel], true);
        }
        view.setUint32(108, 0x1000, true);

        let fields = format.masks.flatMap((mask, channel) => {
            if (!mask) {
                return [];
            }
            let shift = 31 - Math.clz32(mask & -mask);
            return [{channel, shift, max: mask >>> shift}];
        });
        for (let source = 0, target = headerSize; source < image.data.length; source += 4, target += bytesPerPixel) {
            let pixel = 0;
            for (let {channel, shift, max} of fields) {
                pixel |= Math.round(image.data[source + channel] * max / 255) << shift;
            }
            for (let byte = 0; byte < bytesPerPixel; ++byte) {
                bytes[target + byte] = pixel >>> (byte * 8);
            }
        }
        return new Blob([bytes], {type: "image/vnd-ms.dds"});
    }

    static applyBc1Alpha(bytes, image) {
        // ImageMagick's BC1 encoder treats every pixel as opaque. Change blocks
        // with transparent pixels to BC1's three-color mode plus transparency.
        let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        for (let y = 0, offset = 128; y < image.height; y += 4) {
            for (let x = 0; x < image.width; x += 4, offset += 8) {
                let rows = Math.min(4, image.height - y);
                let columns = Math.min(4, image.width - x);
                let alphaMask = 0;
                for (let dy = 0; dy < rows; ++dy) {
                    for (let dx = 0; dx < columns; ++dx) {
                        let index = ((y + dy) * image.width + x + dx) * 4;
                        if (image.data[index + 3] < 128) {
                            alphaMask |= 3 << (2 * (dy * 4 + dx));
                        }
                    }
                }
                if (alphaMask === 0) {
                    continue;
                }
                let first = view.getUint16(offset, true);
                let second = view.getUint16(offset + 2, true);
                let low = Math.min(first, second);
                let high = Math.max(first, second);
                view.setUint16(offset, low, true);
                view.setUint16(offset + 2, high, true);
                let colors = [this.unpack565(low), this.unpack565(high)];
                colors.push(colors[0].map((value, channel) => (value + colors[1][channel]) >> 1));
                let selectors = alphaMask;
                for (let dy = 0; dy < rows; ++dy) {
                    for (let dx = 0; dx < columns; ++dx) {
                        let shift = 2 * (dy * 4 + dx);
                        if (alphaMask & (3 << shift)) {
                            continue;
                        }
                        let index = ((y + dy) * image.width + x + dx) * 4;
                        let nearest = 0;
                        let best = Infinity;
                        for (let i = 0; i < colors.length; ++i) {
                            let [r, g, b] = colors[i];
                            let distance = (r - image.data[index]) ** 2
                                + (g - image.data[index + 1]) ** 2 + (b - image.data[index + 2]) ** 2;
                            if (distance < best) {
                                nearest = i;
                                best = distance;
                            }
                        }
                        selectors |= nearest << shift;
                    }
                }
                view.setUint32(offset + 4, selectors, true);
            }
        }
    }

    static unpack565(pixel) {
        let r = pixel >> 11;
        let g = (pixel >> 5) & 63;
        let b = pixel & 31;
        return [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)];
    }
}
