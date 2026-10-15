# Using other effects

An effect plugin can build a chain from Paint.js effects and other installed plugins.

## Find available effects

```js
let effects = paintDotJs.effects.list();
let blur = effects.find(effect => effect.name === "Gaussian Blur");
```

Each entry contains its `id`, visible `name`, menu, category, controls, and default
values. Read the list when your dialog opens so newly installed plugins are included.

## Open the effect's own dialog

```js
let values = await paintDotJs.effects.configure(blur.id, {
    source,
    width,
    height,
    selection,
    values: blur.values,
    preview: nextValues => previewChain(blur.id, nextValues)
});
```

This uses the same dialog the effect normally shows. It returns `null` when the
user cancels. The preview callback receives `null` when the original image should
be shown.

## Apply one effect

```js
let result = paintDotJs.effects.apply(
    blur.id,
    source,
    width,
    height,
    {...blur.values, radius: 12},
    selection
);
```

The source and result are RGBA `Uint8ClampedArray` objects. Apply another effect
to `result` to form a chain. Do not include your own effect in the chain or create
a recursive cycle.
