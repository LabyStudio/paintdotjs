# paint.js plugin guide

A paint.js plugin is a `.paintjs` ZIP package containing JavaScript. Plugins can add:

- effects and adjustments;
- import and export formats.

Start with [Getting started](getting-started.md). The other pages cover one feature at a time.

## Guides

1. [Getting started](getting-started.md) — create, package, and install a small plugin.
2. [Pixel effects](effects.md) — change pixels and choose a menu location.
3. [Effect controls](controls.md) — add sliders, checkboxes, lists, colors, and text.
4. [Whole-image effects](whole-image-effects.md) — blur, transform, and work with selections.
5. [File types](file-types.md) — add import and export formats.
6. [Assets, workers, and helpers](assets-workers-helpers.md) — icons, performance, and pixel utilities.
7. [Publishing](publishing.md) — build packages and add them to the catalog.

## Current scope

The API version is `1`. It supports effects and file types. It does not support arbitrary tools, panels, native Paint.NET DLLs, or custom shapes. Install custom shapes separately as Paint.NET `.xaml` files; see [Custom shapes](../shapes.md).

Plugins run with the same access as paint.js. Only install code you trust.
