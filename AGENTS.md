# paint.js code style

## Release flow

- Make release changes on `develop`.
- Merge `develop` into `master`; do not cherry-pick release or hotfix commits directly onto `master`.
- After the merge is pushed, switch back to `develop` and bump it to the next development version.

## Debugging and verification

Prefer the local Electron app for canvas, tools, and history debugging. The user has experienced stale caches and repeated startup errors when agents open the site in Codex browser tabs. Do not default to opening another Codex tab for these tests.

### Launch an isolated instance

Run from the repository root. Build the current checkout first with `npm run desktop:build`. On Linux, launch Electron under Xvfb in a persistent terminal session:

```sh
paint_debug_profile=$(mktemp -d /tmp/paintdotjs-debug.XXXXXX)
echo "$paint_debug_profile"
xvfb-run -a ./node_modules/.bin/electron . \
  --ozone-platform=x11 \
  --user-data-dir="$paint_debug_profile" \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9333
```

- Record the terminal session and exact temporary profile path for cleanup. Use a free debugging port if 9333 is occupied; never attach to or stop another agent's or the user's instance.
- `--ozone-platform=x11` keeps Electron on Xvfb; without it, Electron may select Wayland and show the test window on the user's desktop.
- The temporary profile isolates settings, caches, and Electron's single-instance lock from the user's normal app. Xvfb keeps the test window off their desktop.
- Wait for the DevTools listening message, then query `http://127.0.0.1:9333/json`. Select the page with the expected app URL (normally `paintjs://app/index.html`) and connect to its `webSocketDebuggerUrl` using Chrome DevTools Protocol (CDP).
- Node's `fetch` and `WebSocket` can be used for a small CDP harness. Match responses by request ID, handle protocol errors and `Runtime.evaluate` exception details, and use bounded timeouts. Do not assume the first target is the app.
- Check `window.app`, the active workspace, tool, and document before testing. After source edits, rebuild and restart the isolated instance to ensure the running code matches the checkout.

### Reproduce and inspect

- Use `Runtime.evaluate` to inspect the real app state: `window.app.getActiveDocumentWorkspace()`, its `getHistory()` undo/redo stacks, `window.app.getActiveTool()`, and layer canvas pixels via `getImageData()`.
- For deterministic ordering tests, invoke the actual tool methods (`onMouseDown`, `onMouseMove`, `onMouseUp`) and history operations in a controlled sequence. For example, bucket mouse-down followed by `history.stepBackward()` before mouse-up tests Undo during an unfinished draw.
- Assert results, not just absence of exceptions: verify history entries, pending tool state, and pixel values or full-image comparisons. Test Undo, Redo, and return to the initial document state. When practical, confirm the same test fails before the fix.
- Direct method calls bypass event routing, shortcuts, pointer capture, and coordinate conversion. For touch, keyboard, dragging, dropdown, or layout bugs, also exercise real UI input (for example CDP `Input` events) and inspect screenshots as appropriate. State clearly which level was tested.
- Compare behavior with a locally obtained copy of the target Paint.NET source when port accuracy matters.
- Electron does not prove browser-only behavior such as service workers or web updates. Test those in a fresh, isolated browser context against the local build, checking its version and cache state.

### Finish

- Stop only the test process launched for this task, then remove only its recorded temporary profile and harness files. Do not use broad process-kill or cleanup commands.
- Run relevant regression checks and the repository build/checks before reporting a fix. Report any remaining test limitations; a successful build alone does not verify interaction behavior.

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
- Keep executable scripts at the root of `scripts`, but put reusable script classes in a nested package under `scripts`.
