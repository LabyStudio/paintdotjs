# Whole-image effects

Use `render()` when an output pixel depends on neighboring pixels or when pixels move to new coordinates.

## Understand the buffers

```javascript
render({source, destination, width, height}) {
    // Read from source. Write to destination.
}
```

Both buffers contain RGBA bytes:

```text
pixel 0: red, green, blue, alpha
pixel 1: red, green, blue, alpha
...
```

`destination` starts as a copy of `source`. Always read from `source` so earlier writes do not affect later pixels.

## Example: flip the selected area

```javascript
paintDotJs.registerPlugin({
    effects: [{
        id: "flip-horizontal",
        name: "Flip Horizontal",
        category: "Distort",

        render({source, destination, width, selectionBounds}) {
            const bounds = selectionBounds;

            for (let y = bounds.y; y < bounds.y + bounds.height; ++y) {
                for (let x = bounds.x; x < bounds.x + bounds.width; ++x) {
                    const sourceX = bounds.x + bounds.width - 1 - (x - bounds.x);
                    const from = (y * width + sourceX) * 4;
                    const to = (y * width + x) * 4;
                    destination.set(source.subarray(from, from + 4), to);
                }
            }
        }
    }]
});
```

The host applies the selection mask after rendering. Do not blend the mask yourself.

## Example: blur with the helper API

```javascript
const kernel = [
    1, 1, 1,
    1, 1, 1,
    1, 1, 1
];

paintDotJs.registerPlugin({
    effects: [{
        id: "box-blur",
        name: "Box Blur",
        category: "Blurs",

        render({source, destination, width, height}) {
            const blurred = paintDotJs.pixels.convolve(
                source,
                width,
                height,
                kernel,
                {divisor: 9, preserveAlpha: true}
            );
            destination.set(blurred);
        }
    }]
});
```

## Available render data

`render()` receives:

- `source` and `destination` — `Uint8ClampedArray` RGBA buffers;
- `width` and `height`;
- `values` — control values;
- `selection` — copied selection coverage bytes, or `null` for the full canvas;
- `selectionBounds` — `{x, y, width, height}`.

Rendering is synchronous in API version 1. The function may:

- modify `destination` and return nothing;
- return `destination`;
- return a correctly sized `Uint8ClampedArray`;
- return an `ImageData` with the original dimensions.

[Previous: Effect controls](controls.md) · [Next: File types](file-types.md)
