# Effect controls

Add a `controls` array to open a configuration dialog before the effect runs.

## A complete example

```javascript
const {range, checkbox, select, color, text} = paintDotJs.controls;

paintDotJs.registerPlugin({
    effects: [{
        id: "channel-scale",
        name: "Channel Scale",
        category: "Color",
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
            const channels = [r, g, b];
            const index = {red: 0, green: 1, blue: 2}[values.channel];
            channels[index] *= values.amount;
            return [
                channels[0],
                channels[1],
                channels[2],
                values.preserveAlpha ? a : 255
            ];
        }
    }]
});
```

Each control has a unique key. Its current value is available as `values[key]`.

## Slider

```javascript
range("amount", "Amount", 0, 100, 50, 1)
```

Arguments: key, label, minimum, maximum, default, step.

Use a colored track when the value represents a color property:

```javascript
range("hue", "Hue", 0, 360, 0, 1, {track: "hue"})
```

Track styles:

```text
hue                    hue-shift
saturation             saturation-adjustment
lightness              alpha
contrast               cyan-red
magenta-green          yellow-blue
temperature            tint
```

An empty label, `""`, leaves out the heading. This is useful for a second slider in the same visual group.

## Checkbox

```javascript
checkbox("preserveAlpha", "Preserve alpha", true)
```

The value is a boolean.

## Choice list

```javascript
select("mode", "Mode", "soft", [
    ["soft", "Soft"],
    ["hard", "Hard"]
])
```

Values are strings. The default must match one choice.

## Color

```javascript
color("tint", "Tint", "#ff8800")
```

The value is a six-digit hexadecimal color string.

## Text

```javascript
text("caption", "Caption", "Hello")
```

Text values may contain up to 4096 characters.

## Dialog title

Use `dialogTitle` on one effect:

```javascript
{
    id: "levels-plus",
    name: "Levels+",
    dialogTitle: "Levels+ Settings",
    controls: [],
    renderPixel({r, g, b, a}) {
        return [r, g, b, a];
    }
}
```

You may instead put `dialogTitle` in `plugin.json` to use it for every effect in that package.

[Previous: Pixel effects](effects.md) · [Next: Whole-image effects](whole-image-effects.md)
