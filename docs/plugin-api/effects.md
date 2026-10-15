# Pixel effects

Use `renderPixel()` when each output pixel depends only on that pixel and its coordinates.

## Start with a color effect

```javascript
paintDotJs.registerPlugin({
    effects: [{
        id: "swap-red-blue",
        name: "Swap Red and Blue",
        category: "Color",

        renderPixel({r, g, b, a}) {
            return [b, g, r, a];
        }
    }]
});
```

Return `[red, green, blue, alpha]`. Channels are clamped to `0–255` by paint.js.

`renderPixel()` receives:

- `r`, `g`, `b`, `a` — current channels;
- `x`, `y` — pixel coordinates;
- `width`, `height` — canvas size;
- `values` — settings from the effect controls.

## Use coordinates

This creates a simple checkerboard fade:

```javascript
renderPixel({r, g, b, a, x, y}) {
    const darkSquare = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
    return [r, g, b, darkSquare ? a : a / 2];
}
```

## Choose the menu

Effects go into **Effects** by default.

```javascript
{
    id: "warm",
    name: "Warm",
    menu: "Adjustments",
    category: "Color",
    renderPixel({r, g, b, a}) {
        return [r + 20, g, b - 10, a];
    }
}
```

- `menu` is `"Effects"` or `"Adjustments"`.
- `category` is the submenu name.
- Use `category: "Root"` to put the command directly in the menu.

## Add several effects

One plugin may register multiple effects:

```javascript
paintDotJs.registerPlugin({
    effects: [
        {
            id: "red-only",
            name: "Red Only",
            category: "Color",
            renderPixel({r, a}) {
                return [r, 0, 0, a];
            }
        },
        {
            id: "blue-only",
            name: "Blue Only",
            category: "Color",
            renderPixel({b, a}) {
                return [0, 0, b, a];
            }
        }
    ]
});
```

paint.js provides preview, selection masking, undo, remembered settings, and **Repeat Effect**.

[Previous: Getting started](getting-started.md) · [Next: Effect controls](controls.md)
