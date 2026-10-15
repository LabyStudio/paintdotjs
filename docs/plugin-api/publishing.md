# Publishing a plugin

You can install a `.paintjs` file locally without publishing it. The catalog is only needed when you want the plugin to appear under **Browse plugins**.

## Before publishing

Check these items:

- the plugin ID will not change;
- the version was increased;
- the original creator is credited in `author` and `copyright`;
- the website points to the creator or original project;
- the license allows distribution;
- the effect output, defaults, selections, and transparency were tested.

## Repository layout

In `paintdotjs-plugins`, add one source directory:

```text
plugins/
└── my-plugin/
    ├── plugin.json
    ├── plugin.js
    └── assets/          (optional)
        └── effect.png
```

Do not add a built `.paintjs` file. Packages and the catalog are generated.

## Build locally

```sh
npm ci
npm run build
```

Generated files appear in `dist/`:

```text
dist/
├── catalog.json
├── my-plugin.paintjs
└── ...
```

Install the generated package in paint.js and test it before pushing.

## Catalog deployment

Pushing the source repository's `main` branch runs the publication workflow. It:

1. builds every plugin package;
2. creates `catalog.json` with package hashes;
3. uploads the generated files to the stable `catalog` GitHub Release.

paint.js reads that release directly. There is no catalog server and generated files are not committed.

## Updating a plugin

Change the source, increase `version` in `plugin.json`, rebuild, and test the new package. Keep the same plugin ID so an installation replaces the earlier version.

[Previous: Assets, workers, and helpers](assets-workers-helpers.md) · [Back to the guide](README.md)
