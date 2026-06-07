# Repository Guidelines

## Project Structure & Module Organization

The main application lives in `src/main/webapp`. Core editor source is under `src/main/webapp/js/grapheditor`, product-specific code under `src/main/webapp/js/diagramly`, styles under `src/main/webapp/styles`, and static assets/resources under `src/main/webapp/resources`. Build and packaging files are in `etc/build`; helper utilities with their own dependencies are in `etc/propgen`, `etc/imageResize`, and `etc/dependencies`. Documentation and policy files are in `docs/` and root-level Markdown files.

## Build, Test, and Development Commands

- `src/main/webapp/index.html?dev=1`: run the editor directly from source in a browser or local static server.
- `src/main/webapp/index.html?dev=1&ui=classic`: keep the classic menubar visible while testing UI changes.
- `cd etc/build && ant app`: build the web application package when Java and Ant are installed.
- `node --check src/main/webapp/js/grapheditor/Graph.js`: quick syntax check for edited JavaScript files.
- `cd etc/dependencies && npm install`: install third-party web dependencies for that helper package.

There is no single root `npm test` target. Use targeted checks plus browser testing for changed behavior.

## Coding Style & Naming Conventions

JavaScript uses tabs, prototype-based classes, and existing draw.io globals such as `Graph`, `EditorUi`, `mxUtils`, and `mxEvent`. Follow nearby file patterns rather than introducing module syntax. Use camelCase for methods and variables, PascalCase for constructor functions, and resource keys in lower camelCase. Keep UI strings in `src/main/webapp/resources/dia.txt` when user-visible.

For dialogs, follow `DIALOG_STYLE_GUIDE.md`; prefer existing CSS classes and `mxResources.get(...)` over inline one-off text.

## Testing Guidelines

For UI work, manually test with `?dev=1` in current Chrome/Firefox-compatible browsers. Exercise the changed workflow, adjacent existing actions, save/reopen behavior, and export impact when relevant. For JavaScript edits, run `node --check` on each touched file. If the Ant toolchain is available, run `cd etc/build && ant app` before handing off packaging-sensitive changes.

## Commit & Pull Request Guidelines

Recent history uses short, imperative or release-style commit subjects, for example `Add temporary layer opacity controls` or `30.0.2 release`. Keep commits focused and avoid mixing generated or unrelated files.

The upstream README states that external pull requests are not accepted, but local branches should still include a clear description, reproduction steps for bugs, test notes, and screenshots or recordings for visual UI changes.

## Security & Configuration Tips

Do not commit secrets, service credentials, or local build artifacts. Respect the license and trademark notes in `README.md`, especially restrictions around icon sets, stencil libraries, and draw.io branding.
