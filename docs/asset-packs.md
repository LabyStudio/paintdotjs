# Icon packs

paint.js icon packs are ZIP files that replace some or all of the application's images and translations. Packs are stored locally in the browser or desktop application and are not uploaded.

## Install a pack

Open **Settings → Icon Packs** to install a pack.

- Image changes apply immediately.
- Reload paint.js to apply translations.

## Create a pack

### 1. Organize the ZIP

The ZIP may contain a single top-level folder, as shown below:

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

Only `asset-pack.json` is required. Include whichever images and language files you want to replace; missing images and translation keys fall back to the built-in pack.

### 2. Add the manifest

Create `asset-pack.json` at the root of the pack:

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

### 3. Add images and translations

#### Images

Browse the repository's [built-in assets folder](../assets/) to see which files can be replaced. Images must be PNG or WebP files.

Keep the same path relative to `assets/` inside your pack. For example, to replace `assets/icons/menu_file_open_icon.png`, add your version as `icons/menu_file_open_icon.png`.

#### Translations

Place language files in `lang/`, for example `lang/en.json` or `lang/de.json`. Use the same nested JSON keys as [the built-in English translations](../assets/lang/en.json).
