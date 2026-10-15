# File types

A file-type plugin can import files, export files, or do both.

This example stores a small header followed by raw RGBA pixels.

## 1. Register the format

```javascript
paintDotJs.registerPlugin({
    fileTypes: [{
        id: "raw-rgba",
        name: "Raw RGBA",
        extensions: [".rgba"],
        mime: "application/x-raw-rgba",
        decode: decodeRgba,
        encode: encodeRgba
    }]
});
```

An extension starts with a dot and uses lowercase letters or numbers. Built-in paint.js formats are reserved.

## 2. Decode a file

```javascript
async function decodeRgba({bytes, fileName}) {
    if (bytes.length < 12
        || String.fromCharCode(...bytes.subarray(0, 4)) !== "PJS1") {
        throw new Error(`${fileName} is not a Raw RGBA file.`);
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(4, true);
    const height = view.getUint32(8, true);

    return {
        width,
        height,
        data: bytes.slice(12)
    };
}
```

Returning `width`, `height`, and `data` creates a document with one background layer. `data` must contain exactly `width * height * 4` RGBA bytes.

## 3. Encode a file

```javascript
async function encodeRgba({document}) {
    const pixels = document.layers[0].data;
    const output = new Uint8Array(12 + pixels.length);
    output.set([80, 74, 83, 49]); // PJS1

    const view = new DataView(output.buffer);
    view.setUint32(4, document.width, true);
    view.setUint32(8, document.height, true);
    output.set(pixels, 12);
    return output;
}
```

`encode()` may return a `Blob`, `Uint8Array`, `Uint8ClampedArray`, or `ArrayBuffer`.

If `supportsLayers` is omitted, paint.js flattens the document before calling `encode()`.

## Layered formats

Set `supportsLayers: true` and return a `layers` array:

```javascript
return {
    width: 640,
    height: 480,
    resolution: 96,
    activeLayer: 1,
    layers: [
        {
            name: "Background",
            visible: true,
            opacity: 255,
            blendMode: "normal",
            data: backgroundPixels
        },
        {
            name: "Drawing",
            visible: true,
            opacity: 200,
            blendMode: "multiply",
            data: drawingPixels
        }
    ]
};
```

Layer order is bottom to top. Every layer uses a full-canvas RGBA buffer.

## Export settings

Use the same controls as effects:

```javascript
{
    id: "example",
    name: "Example Image",
    extensions: [".example"],
    saveControls: [
        paintDotJs.controls.range("quality", "Quality", 1, 100, 90, 1),
        paintDotJs.controls.checkbox("metadata", "Include metadata", true)
    ],

    async encode({document, values}) {
        console.log(values.quality, values.metadata);
        // Return encoded bytes.
    }
}
```

Omit `decode()` for an export-only format. Omit `encode()` for an import-only format.

## Limits

- Maximum input or output size: 256 MB.
- Maximum dimensions: 32768 × 32768.
- Maximum layers: 64.
- Maximum total layer pixels: 64 million.
- Two enabled plugins cannot claim the same extension.

[Previous: Whole-image effects](whole-image-effects.md) · [Next: Assets, workers, and helpers](assets-workers-helpers.md)
