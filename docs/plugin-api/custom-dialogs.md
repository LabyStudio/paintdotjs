# Custom effect dialogs

Use the standard controls whenever they can describe an effect. Use `configure()` only for an interactive canvas, a curve editor, a variable-length list, or another specialized editor.

## Add a configurator

```javascript
paintDotJs.registerPlugin({
    effects: [{
        id: "interactive-example",
        name: "Interactive Example",
        controls: [],

        async configure(context) {
            const values = {...context.values};

            // Build and show your modal UI here. Call context.preview(values)
            // whenever the edited values should be rendered on the document.

            return values; // Return null when the user cancels.
        },

        render({source, destination}) {
            destination.set(source);
        }
    }]
});
```

The plugin owns the custom dialog's DOM and must remove it before resolving. The returned value must contain structured-cloneable data so paint.js can remember it for **Repeat Effect**.

## Context

`configure(context)` receives:

- `title` and `icon` for the effect identity;
- copied `source` RGBA bytes plus `width` and `height`;
- a copied `selection` coverage mask, or `null` for the whole image;
- `selectionBounds` as `{x, y, width, height}`;
- remembered or default `values`;
- `preview(values)`, which updates the document preview and may return a promise;
- `showOriginal()`, which restores the unmodified preview.

Await `preview()` when later UI work depends on the rendered result. Coalesce frequent pointer events with `requestAnimationFrame()`.

## Create the window

Use the dialog API instead of assembling the outer window yourself:

```javascript
const dialogWindow = paintDotJs.dialogs.create({
    title: context.title,
    icon: context.icon,
    className: "my-effect-dialog",
    contentClassName: "my-effect-content"
});
```

The returned `dialog` is a form, `content` is where your controls go, and
`closeButton` is the title-bar close button. The window is modal and movable by
default. Remove it through the returned controller:

```javascript
dialogWindow.destroy();
```

[Previous: Effect controls](controls.md) · [Next: Whole-image effects](whole-image-effects.md)
