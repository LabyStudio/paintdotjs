# paint.js JavaScript plugin API

paint.js plugins are local JavaScript files ending in `.js` or `.paintjs`. Install them from **Settings → Plugins**, or drag the file anywhere onto paint.js.

> Plugins execute JavaScript in the paint.js application. Install only plugins whose source and author you trust.

## Minimal plugin

```javascript
paintDotJs.registerPlugin({
    apiVersion: 1,
    id: "example.invert-red",
    name: "Invert Red",
    author: "Example Author",
    version: "1.0.0",
    description: "An example paint.js effect plugin.",
    effects: [
        {
            id: "invert-red",
            name: "Invert Red",
            category: "Color",
            renderPixel({r, g, b, a}) {
                return [255 - r, g, b, a];
            }
        }
    ]
});
```

The plugin must call `paintDotJs.registerPlugin()` exactly once while the file loads. Plugin and effect IDs use lowercase letters, numbers, dots, dashes, and underscores. IDs are stable identifiers; changing one creates a different plugin or effect.

Installed effects appear under **Effects → Plugins** and automatically use paint.js selection masking, previews, undo history, remembered settings, and Repeat Effect.

## Configurable effects

API version 1 supports range, checkbox, and select controls:

```javascript
const {range, checkbox, select} = paintDotJs.controls;

paintDotJs.registerPlugin({
    apiVersion: 1,
    id: "example.channels",
    name: "Channel Tools",
    effects: [
        {
            id: "channel-scale",
            name: "Channel Scale",
            controls: [
                range("amount", "Amount", 0, 2, 1, 0.01),
                select("channel", "Channel", "red", [
                    ["red", "Red"],
                    ["green", "Green"],
                    ["blue", "Blue"]
                ]),
                checkbox("preserveAlpha", "Preserve alpha", true)
            ],
            renderPixel({r, g, b, a, values}) {
                const color = [r, g, b];
                const index = {red: 0, green: 1, blue: 2}[values.channel];
                color[index] *= values.amount;
                return [color[0], color[1], color[2], values.preserveAlpha ? a : 255];
            }
        }
    ]
});
```

`renderPixel()` receives `r`, `g`, `b`, `a`, `x`, `y`, `width`, `height`, and `values`. It must synchronously return four channel values. Values outside 0–255 are clamped when written to the image.

## Whole-image effects

Neighborhood and generated effects can use `render()` instead:

```javascript
render({source, destination, width, height, values}) {
    for (let offset = 0; offset < source.length; offset += 4) {
        destination[offset] = source[offset];
        destination[offset + 1] = source[offset + 1];
        destination[offset + 2] = source[offset + 2];
        destination[offset + 3] = source[offset + 3];
    }
}
```

`source` and `destination` are `Uint8ClampedArray` RGBA buffers. `destination` starts as a copy of `source`. A renderer may modify it and return nothing, or return an `ImageData` or correctly sized `Uint8ClampedArray`. Rendering is synchronous in API version 1.

## Plugin shape

```text
Plugin
├── apiVersion: 1
├── id, name
├── author, version, description (optional)
└── effects[]
    ├── id, name
    ├── category, icon (optional)
    ├── controls[] (optional)
    └── renderPixel() or render()
```

`icon`, when provided, currently names a PNG already included with paint.js. Custom packaged assets and worker-based asynchronous rendering are planned for a later API version.

The API is intentionally declarative around effect metadata. This is also the target format for the planned Paint.NET DLL compatibility converter.
