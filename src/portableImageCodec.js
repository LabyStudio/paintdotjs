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

import jpegXrFactory from 'jpegxr'
import {
    ImageMagick,
    MagickFormat,
    initializeImageMagick
} from '@imagemagick/magick-wasm'
import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm'

let imageMagickPromise = null;

const initializePortableCodecs = () => {
    if (imageMagickPromise === null) {
        imageMagickPromise = fetch(magickWasmUrl)
            .then(response => {
                if (!response.ok) throw new Error('Could not load the bundled image codecs');
                return response.arrayBuffer();
            })
            .then(bytes => initializeImageMagick(new Uint8Array(bytes)));
    }
    return imageMagickPromise;
};

const magickFormat = format => ({
    png: MagickFormat.Png,
    jpeg: MagickFormat.Jpeg,
    jpg: MagickFormat.Jpeg,
    jpe: MagickFormat.Jpeg,
    webp: MagickFormat.WebP,
    gif: MagickFormat.Gif,
    bmp: MagickFormat.Bmp,
    avif: MagickFormat.Avif,
    heic: MagickFormat.Heic,
    heif: MagickFormat.Heif,
    jxl: MagickFormat.Jxl,
    dds: MagickFormat.Dds,
    tiff: MagickFormat.Tiff,
    tif: MagickFormat.Tiff,
    tga: MagickFormat.Tga
})[format] || MagickFormat.Unknown;

const decodeJpegXr = async bytes => {
    const codec = await jpegXrFactory();
    const decoded = codec.decode(bytes);
    const info = decoded.pixelInfo;
    if ((info.channels !== 3 && info.channels !== 4) || info.colorFormat !== 'RGB') {
        throw new Error('This JPEG XR pixel format is not supported');
    }
    let samples;
    let sample = null;
    if (info.bitDepth === '8') {
        samples = decoded.bytes;
        sample = index => samples[index] / 255;
    } else if (info.bitDepth === '16') {
        samples = new Uint16Array(decoded.bytes.buffer, decoded.bytes.byteOffset, decoded.bytes.byteLength / 2);
        sample = index => samples[index] / 65535;
    } else if (info.bitDepth === '32Float') {
        samples = new Float32Array(decoded.bytes.buffer, decoded.bytes.byteOffset, decoded.bytes.byteLength / 4);
        sample = index => Math.max(0, samples[index]) / (1 + Math.max(0, samples[index]));
    } else {
        throw new Error('This JPEG XR bit depth is not supported: ' + info.bitDepth);
    }
    const rgba = new Uint8ClampedArray(decoded.width * decoded.height * 4);
    const linearColor = info.bitDepth === '32Float';
    for (let source = 0, target = 0; target < rgba.length; source += info.channels, target += 4) {
        const alpha = info.hasAlpha ? Math.max(0, Math.min(1, sample(source + 3))) : 1;
        const color = channel => {
            const value = sample(source + channel);
            const unpremultiplied = info.premultipledAlpha && alpha > 0 ? value / alpha : value;
            const normalized = Math.max(0, Math.min(1, unpremultiplied));
            return Math.round((linearColor ? Math.pow(normalized, 1 / 2.2) : normalized) * 255);
        };
        rgba[target] = color(info.bgr ? 2 : 0);
        rgba[target + 1] = color(1);
        rgba[target + 2] = color(info.bgr ? 0 : 2);
        rgba[target + 3] = Math.round(alpha * 255);
    }
    return {width: decoded.width, height: decoded.height, rgba};
};

export async function decode(bytes, format) {
    if (format === 'jxr' || format === 'wdp' || format === 'wmp') return decodeJpegXr(bytes);
    await initializePortableCodecs();
    const inputFormat = magickFormat(format);
    if (inputFormat === MagickFormat.Unknown) throw new Error('Unsupported image format: ' + format);
    return ImageMagick.read(bytes, inputFormat, image => {
        image.autoOrient();
        image.depth = 8;
        return image.write(MagickFormat.Rgba, rgba => ({
            width: image.width,
            height: image.height,
            rgba: new Uint8ClampedArray(rgba)
        }));
    });
}

export async function encode(pngBytes, format, quality, options = {}) {
    await initializePortableCodecs();
    const outputFormat = magickFormat(format);
    if (outputFormat === MagickFormat.Unknown) throw new Error('Unsupported image format: ' + format);
    return ImageMagick.read(pngBytes, MagickFormat.Png, image => {
        image.quality = quality;
        if (outputFormat === MagickFormat.Jpeg && options.subsampling) {
            image.settings.setDefine(MagickFormat.Jpeg, 'sampling-factor', options.subsampling);
            image.setArtifact('jpeg:sampling-factor', options.subsampling);
        }
        return image.write(outputFormat, bytes => new Uint8Array(bytes));
    });
}
