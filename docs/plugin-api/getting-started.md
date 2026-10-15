# Getting started

This example adds **Invert Red** to the Effects menu.

## 1. Create the plugin folder

```text
invert-red/
├── plugin.json
└── plugin.js
```

`plugin.json` describes the package:

```json
{
  "id": "example.invert-red",
  "name": "Invert Red",
  "version": "1.0.0",
  "apiVersion": 1,
  "author": "Your Name",
  "website": "https://example.com/",
  "copyright": "Copyright © Your Name",
  "description": "Inverts the red channel.",
  "category": "Effects",
  "license": "MIT"
}
```

Use a stable lowercase ID. It may contain letters, numbers, dots, dashes, and underscores. The website must use HTTPS.

## 2. Add the effect

Put the behavior in `plugin.js`:

```javascript
paintDotJs.registerPlugin({
    effects: [{
        id: "invert-red",
        name: "Invert Red",
        category: "Color",

        renderPixel({r, g, b, a}) {
            return [255 - r, g, b, a];
        }
    }]
});
```

Call `paintDotJs.registerPlugin()` exactly once. Identity and creator details stay in `plugin.json`; do not repeat them in `plugin.js`.

## 3. Create the package

The two files must be at the root of the ZIP, not inside another folder.

```sh
cd invert-red
zip ../invert-red.paintjs plugin.json plugin.js
```

The file extension must be `.paintjs`.

## 4. Install it

In paint.js, open **Settings → Plugins** and choose **Install plugin**, or drag `invert-red.paintjs` onto the app.

The effect now appears under **Effects → Color → Invert Red**.

## Next

- Add more effect behavior in [Pixel effects](effects.md).
- Add a settings dialog in [Effect controls](controls.md).
- Add an icon in [Assets, workers, and helpers](assets-workers-helpers.md).

[Back to the guide](README.md)
