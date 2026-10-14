# Icon packs

paint.js icon packs are ZIP files that replace some or all of the application's images and translations. Packs are stored locally in the browser or desktop application and are not uploaded.

Only distribute artwork and translations that you created or have permission to redistribute. An icon pack is not a way to bypass another project's license.

## ZIP structure

The ZIP may contain a single top-level folder. Its contents use this layout:

```text
my-pack/
  asset-pack.json
  icons/
    menu_file_open_icon.png
  images/
    animation_busy_spinner.png
  cursors/
    paint_brush_tool_cursor.png
  lang/
    en.json
    de.json
```

`asset-pack.json` is required:

```json
{
  "formatVersion": 1,
  "id": "example.my-pack",
  "name": "My Icon Pack",
  "author": "Example Author",
  "version": "1.0.0",
  "description": "Original icons for paint.js"
}
```

Every other file is optional. Missing images and translation keys fall back to the built-in pack. Images must be PNG or WebP files. Language files use the same nested JSON keys as `assets/lang/en.json`.

Browse the repository's [built-in assets folder](../assets/) to see which files can be replaced. Keep the same path relative to `assets/` inside your ZIP. For example, to replace `assets/icons/menu_file_open_icon.png`, add your version as `icons/menu_file_open_icon.png`.

Install a pack from **Settings → Icon Packs**. Image changes apply immediately; reload paint.js to apply translations.
