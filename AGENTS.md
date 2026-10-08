# paint.js code style

## Control flow

- Always use braces for `if`, `else`, loops, and every other control-flow body, including one-line bodies.
- Never write guard clauses such as `if (condition) return;`; put the `return` inside a braced block.

## Variables

- Use `let` for ordinary local variables and DOM element references, matching the established project style.
- Use `const` for actual constants or when the surrounding code clearly treats the value as a constant; do not make new methods uniformly `const`-heavy.

## UI construction

- Build DOM elements in parent-to-child order. Immediately after creating and configuring a parent, use a scoped block for its children.
- Add short comments such as `// Title`, `// Footer`, `// Icon`, or `// Actions` to identify meaningful UI sections.
- Append each child near where it is created, preferably with `appendChild()`; do not batch-append a long list at the end of the method.
- Nested UI structures should also use nested scoped blocks so their indentation mirrors the resulting DOM tree.
- Avoid long, flat sequences of unrelated `document.createElement(...)` calls.

Follow the existing builders in `ColorSliderItem`, `ColorCircleItem`, and `ColorsForm` as style references.

## Classes

- Define exactly one class per JavaScript file.
- Name the file after the class it contains.
- Put helper classes, contexts, modes, and enums in their own dedicated files as well.
- Never define inner, nested, local, or secondary classes inside another class's file.
- Prefer inheritance or constructor options when two dialogs share an implementation; for example, a welcome dialog may extend an about dialog or the about dialog may accept a mode parameter.

## Package organization

- Put feature-specific classes in a nested feature package instead of a broad, flat directory. For example, use `engine/document/tool/tool/move/MoveToolContext.js`, not `engine/document/tool/tool/MoveToolContext.js`.
- Put all dialog classes together in the shared `interface/window/dialog` package. For example, use `interface/window/dialog/AboutDialog.js`, not a separate package for each dialog.
- Put non-dialog support classes in the narrowest relevant package outside `dialog`, such as `interface/window/effect/CurveEditor.js` or `interface/window/settings/AppSettingsStore.js`.
- Keep executable scripts at the root of `scripts`, but put reusable script classes in a nested package such as `scripts/resource/ResourceReader.js`.
