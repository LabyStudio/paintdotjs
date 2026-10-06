class ImageEncoder {
    static async encode(canvas, format, options = {}) {
        const quality = Utility.clamp(Number(options.quality ?? 95), 0, 100) / 100;
        switch (format) {
            case "png": return this.canvasToBlob(canvas, "image/png");
            case "jpeg": return this.encodeJpeg(canvas, quality, options);
            case "webp": return this.canvasToBlob(canvas, "image/webp", quality);
            case "bmp": return this.encodeBmp(canvas);
            case "gif": return this.encodeGif(canvas);
            case "tiff": return this.encodeTiff(canvas);
            case "tga": return this.encodeTga(canvas);
            case "dds": return this.encodeDds(canvas);
            case "avif": return this.encodeModern(canvas, "image/avif", "avif", quality);
            case "heic": return this.encodeModern(canvas, "image/heic", "heic", quality);
            case "jxl": return this.encodeModern(canvas, null, "jxl", quality);
            case "jxr": return this.encodeModern(canvas, "image/vnd.ms-photo", "jxr", quality);
            default: throw new Error("Unsupported image format: " + format);
        }
    }

    static canvasToBlob(canvas, type, quality) {
        return new Promise((resolve, reject) => canvas.toBlob(blob => {
            if (blob === null) return reject(new Error("Could not encode " + type));
            if (type !== "image/png" && blob.type !== type) {
                return reject(new Error(type + " encoding is not available in this browser"));
            }
            resolve(blob);
        }, type, quality));
    }

    static async encodeModern(canvas, nativeType, format, quality) {
        if (nativeType !== null) {
            try {
                return await this.canvasToBlob(canvas, nativeType, quality);
            } catch (_) {
                // Use the bundled portable codec below when available.
            }
        }
        if (window.portableImageCodec?.encode === undefined) {
            throw new Error(format.toUpperCase() + " encoding is not available");
        }
        const png = await this.canvasToBlob(canvas, "image/png");
        const result = await window.portableImageCodec.encode(
            new Uint8Array(await png.arrayBuffer()), format, Math.round(quality * 100));
        return new Blob([result], {type: this.mimeFor(format)});
    }

    static async encodeJpeg(canvas, quality, options) {
        const flattened = this.flatten(canvas);
        if (window.portableImageCodec?.encode !== undefined) {
            const png = await this.canvasToBlob(flattened, "image/png");
            const result = await window.portableImageCodec.encode(
                new Uint8Array(await png.arrayBuffer()), "jpeg", Math.round(quality * 100), {
                    subsampling: options.subsampling || "4:2:0"
                });
            return new Blob([result], {type: "image/jpeg"});
        }
        return this.canvasToBlob(flattened, "image/jpeg", quality);
    }

    static mimeFor(format) {
        return {
            avif: "image/avif", heic: "image/heic", jxl: "image/jxl", jxr: "image/vnd.ms-photo",
            bmp: "image/bmp", gif: "image/gif", tiff: "image/tiff", tga: "image/x-tga", dds: "image/vnd-ms.dds"
        }[format] || "application/octet-stream";
    }

    static flatten(canvas) {
        const result = document.createElement("canvas");
        result.width = canvas.width;
        result.height = canvas.height;
        const context = result.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, result.width, result.height);
        context.drawImage(canvas, 0, 0);
        return result;
    }

    static getPixels(canvas, flatten = false) {
        const source = flatten ? this.flatten(canvas) : canvas;
        return source.getContext("2d", {willReadFrequently: true})
            .getImageData(0, 0, source.width, source.height);
    }

    static encodeBmp(canvas) {
        const image = this.getPixels(canvas);
        const offset = 122;
        const buffer = new ArrayBuffer(offset + image.data.length);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        bytes.set([0x42, 0x4d]);
        view.setUint32(2, buffer.byteLength, true);
        view.setUint32(10, offset, true);
        view.setUint32(14, 108, true);
        view.setInt32(18, image.width, true);
        view.setInt32(22, -image.height, true);
        view.setUint16(26, 1, true);
        view.setUint16(28, 32, true);
        view.setUint32(30, 3, true);
        view.setUint32(34, image.data.length, true);
        view.setUint32(54, 0x00ff0000, true);
        view.setUint32(58, 0x0000ff00, true);
        view.setUint32(62, 0x000000ff, true);
        view.setUint32(66, 0xff000000, true);
        bytes.set([0x20, 0x6e, 0x69, 0x57], 70);
        for (let source = 0, target = offset; source < image.data.length; source += 4, target += 4) {
            bytes[target] = image.data[source + 2];
            bytes[target + 1] = image.data[source + 1];
            bytes[target + 2] = image.data[source];
            bytes[target + 3] = image.data[source + 3];
        }
        return new Blob([buffer], {type: "image/bmp"});
    }

    static encodeTga(canvas) {
        const image = this.getPixels(canvas);
        const bytes = new Uint8Array(18 + image.data.length);
        const view = new DataView(bytes.buffer);
        bytes[2] = 2;
        view.setUint16(12, image.width, true);
        view.setUint16(14, image.height, true);
        bytes[16] = 32;
        bytes[17] = 0x28;
        for (let source = 0, target = 18; source < image.data.length; source += 4, target += 4) {
            bytes[target] = image.data[source + 2];
            bytes[target + 1] = image.data[source + 1];
            bytes[target + 2] = image.data[source];
            bytes[target + 3] = image.data[source + 3];
        }
        return new Blob([bytes], {type: "image/x-tga"});
    }

    static encodeDds(canvas) {
        const image = this.getPixels(canvas);
        const bytes = new Uint8Array(128 + image.data.length);
        const view = new DataView(bytes.buffer);
        bytes.set([0x44, 0x44, 0x53, 0x20]);
        view.setUint32(4, 124, true);
        view.setUint32(8, 0x0000100f, true);
        view.setUint32(12, image.height, true);
        view.setUint32(16, image.width, true);
        view.setUint32(20, image.width * 4, true);
        view.setUint32(76, 32, true);
        view.setUint32(80, 0x41, true);
        view.setUint32(88, 32, true);
        view.setUint32(92, 0x000000ff, true);
        view.setUint32(96, 0x0000ff00, true);
        view.setUint32(100, 0x00ff0000, true);
        view.setUint32(104, 0xff000000, true);
        view.setUint32(108, 0x1000, true);
        bytes.set(image.data, 128);
        return new Blob([bytes], {type: "image/vnd-ms.dds"});
    }

    static encodeTiff(canvas) {
        const image = this.getPixels(canvas);
        const entryCount = 11;
        const bitsOffset = 8 + 2 + entryCount * 12 + 4;
        const dataOffset = bitsOffset + 8;
        const buffer = new ArrayBuffer(dataOffset + image.data.length);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        bytes.set([0x49, 0x49]);
        view.setUint16(2, 42, true);
        view.setUint32(4, 8, true);
        view.setUint16(8, entryCount, true);
        let offset = 10;
        const entry = (tag, type, count, value) => {
            view.setUint16(offset, tag, true);
            view.setUint16(offset + 2, type, true);
            view.setUint32(offset + 4, count, true);
            if (type === 3 && count === 1) view.setUint16(offset + 8, value, true);
            else view.setUint32(offset + 8, value, true);
            offset += 12;
        };
        entry(256, 4, 1, image.width);
        entry(257, 4, 1, image.height);
        entry(258, 3, 4, bitsOffset);
        entry(259, 3, 1, 1);
        entry(262, 3, 1, 2);
        entry(273, 4, 1, dataOffset);
        entry(277, 3, 1, 4);
        entry(278, 4, 1, image.height);
        entry(279, 4, 1, image.data.length);
        entry(284, 3, 1, 1);
        entry(338, 3, 1, 2);
        view.setUint32(offset, 0, true);
        for (let i = 0; i < 4; ++i) view.setUint16(bitsOffset + i * 2, 8, true);
        bytes.set(image.data, dataOffset);
        return new Blob([buffer], {type: "image/tiff"});
    }

    static encodeGif(canvas) {
        const image = this.getPixels(canvas, true);
        const indices = new Uint8Array(image.width * image.height);
        for (let pixel = 0, i = 0; pixel < indices.length; ++pixel, i += 4) {
            indices[pixel] = (image.data[i] >> 5) << 5
                | (image.data[i + 1] >> 5) << 2
                | (image.data[i + 2] >> 6);
        }
        const palette = new Uint8Array(768);
        for (let i = 0; i < 256; ++i) {
            palette[i * 3] = Math.round(((i >> 5) & 7) * 255 / 7);
            palette[i * 3 + 1] = Math.round(((i >> 2) & 7) * 255 / 7);
            palette[i * 3 + 2] = Math.round((i & 3) * 255 / 3);
        }
        const compressed = this.gifLzw(indices);
        const chunks = [];
        for (let i = 0; i < compressed.length; i += 255) {
            const chunk = compressed.slice(i, i + 255);
            chunks.push(Uint8Array.of(chunk.length), chunk);
        }
        const header = new Uint8Array(13);
        header.set([71, 73, 70, 56, 57, 97]);
        const headerView = new DataView(header.buffer);
        headerView.setUint16(6, image.width, true);
        headerView.setUint16(8, image.height, true);
        header[10] = 0xf7;
        const descriptor = new Uint8Array(10);
        descriptor[0] = 0x2c;
        const descriptorView = new DataView(descriptor.buffer);
        descriptorView.setUint16(5, image.width, true);
        descriptorView.setUint16(7, image.height, true);
        return new Blob([header, palette, descriptor, Uint8Array.of(8), ...chunks, Uint8Array.of(0, 0x3b)],
            {type: "image/gif"});
    }

    static gifLzw(indices) {
        const output = [];
        let currentByte = 0;
        let bitCount = 0;
        let codeSize = 9;
        let nextCode = 258;
        let dictionary = new Map();
        const write = code => {
            currentByte |= code << bitCount;
            bitCount += codeSize;
            while (bitCount >= 8) {
                output.push(currentByte & 255);
                currentByte >>= 8;
                bitCount -= 8;
            }
        };
        write(256);
        if (indices.length > 0) {
            let prefix = indices[0];
            for (let i = 1; i < indices.length; ++i) {
                const suffix = indices[i];
                const key = prefix + "," + suffix;
                if (dictionary.has(key)) {
                    prefix = dictionary.get(key);
                    continue;
                }
                write(prefix);
                if (nextCode < 4096) {
                    // The decoder builds its table one emitted code behind the
                    // encoder. Grow the code width only after emitting the code
                    // that lets the decoder reach the current table boundary.
                    if (nextCode === (1 << codeSize) && codeSize < 12) ++codeSize;
                    dictionary.set(key, nextCode++);
                } else {
                    write(256);
                    dictionary = new Map();
                    codeSize = 9;
                    nextCode = 258;
                }
                prefix = suffix;
            }
            write(prefix);
        }
        write(257);
        if (bitCount > 0) output.push(currentByte & 255);
        return Uint8Array.from(output);
    }
}
