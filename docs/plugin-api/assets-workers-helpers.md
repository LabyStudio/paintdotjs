# Assets, workers, and helpers

## Package assets

Put optional files in a flat `assets/` directory:

```text
my-plugin/
├── plugin.json
├── plugin.js
└── assets/
    └── effect.png
```

Reference an asset with a literal filename:

```javascript
const icon = paintDotJs.asset("effect.png");

paintDotJs.registerPlugin({
    effects: [{
        id: "my-effect",
        name: "My Effect",
        icon,
        renderPixel({r, g, b, a}) {
            return [r, g, b, a];
        }
    }]
});
```

Effect icons must be PNG files. Other assets may be PNG, JPEG, GIF, WebP, SVG, JSON, or text. Asset names cannot contain subdirectories. Each asset may be at most 384 KB.

`paintDotJs.asset()` is replaced while the package is installed, so the plugin keeps working offline.

## Run effects in a worker

Set `workerSafe: true` when every effect in the package is self-contained:

```javascript
paintDotJs.registerPlugin({
    workerSafe: true,
    effects: [{
        id: "invert",
        name: "Invert",
        renderPixel({r, g, b, a}) {
            return [255 - r, 255 - g, 255 - b, a];
        }
    }]
});
```

Worker-safe code must not use the DOM or paint.js application globals. Local functions and constants in `plugin.js` are available because the complete source is loaded into the worker.

Workers keep expensive previews responsive and allow paint.js to cancel stale renders. They are not a security sandbox.

## Clamp numbers

```javascript
const value = paintDotJs.utils.clamp(input, 0, 1);
const channel = paintDotJs.utils.clampByte(input);
```

`clampByte()` rounds and limits a value to `0–255`.

## Sample a pixel

```javascript
const [r, g, b, a] = paintDotJs.pixels.sample(
    source,
    width,
    height,
    x + 1,
    y
);
```

Coordinates outside the image are clamped to the nearest edge pixel.

## Convert HSV and RGB

```javascript
const [hue, saturation, value] = paintDotJs.pixels.rgbToHsv(r, g, b);
const [red, green, blue] = paintDotJs.pixels.hsvToRgb(hue, saturation, value);
```

Hue is measured in degrees. Saturation and value use `0–1`.

## Convolve an image

```javascript
const sharpened = paintDotJs.pixels.convolve(
    source,
    width,
    height,
    [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
    ],
    {preserveAlpha: true}
);
```

The kernel must be an odd square up to `31 × 31`. Options are `divisor`, `bias`, and `preserveAlpha`.

## Find selection bounds

Whole-image effects already receive `selectionBounds`. If you need to calculate it from a mask:

```javascript
const bounds = paintDotJs.pixels.selectionBounds(selection, width, height);
```

[Previous: File types](file-types.md) · [Next: Publishing](publishing.md)
