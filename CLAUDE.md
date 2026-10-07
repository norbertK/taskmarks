# CLAUDE.md

Taskmarks is a VS Code extension: bookmarks grouped into named tasks, stored in `.vscode/taskmarks.json` so a team can share them. TypeScript, no runtime dependencies.

Read [docu/ARCHITECTURE.md](docu/ARCHITECTURE.md) before changing behavior. It covers the class model, data flows, the mark line-tracking rules, the persistence format and its versions. Keep it up to date when you change any of those.

## Commands

```sh
npm run compile        # tsc -> out/ (this is what the extension runs: main = out/extension.js)
npm run watch          # tsc in watch mode (default for F5 "Launch Extension")
npm run testAll        # compile + all unit tests in plain mocha with the vscode mock, with nyc coverage (fast, use this)
npm test               # integration run in a downloaded VS Code via @vscode/test-electron (slow, needs network)
npm run lint           # eslint --fix: rewrites files
npm run prettify       # prettier --write on all .ts
```

Run a single test file (after `npm run compile`):

```sh
npx mocha --require ./out/test/mocha-setup.js ./out/test/suite/lineAdjustment.test.js
```

Packaging: `npm run "build package"` (vsce). The `esbuild*` scripts produce `out/main.js`, which isn't used or shipped.

`pretest` runs `compile` and `lint`, and lint uses `--fix`, so `npm test` can change source files.

## Layout

- `src/extension.ts`: registers the commands. Every handler delegates to `Helper` (or `Persist` for the clipboard commands).
- `src/Helper.ts`: wires VS Code events (active editor, save, text change incl. undo restore of removed marks) and the command UIs.
- `src/TaskManager.ts` (singleton) → `Task` → `File[]` → `Mark`: the in-memory model.
- `src/Persist.ts`, `src/PathHelper.ts`: load/save `taskmarks.json`, backups, path handling, the global-storage option.
- `src/core/*.ts`: pure logic (navigation, serialization, migration, lineAdjustment, paths). **Must not import `vscode`.** Put new logic here when it can live without VS Code, and test it here.
- `src/test/suite/*.test.ts`: unit tests. `src/test/mock/vscode.mock.ts` is injected for `require('vscode')` by `src/test/mocha-setup.ts`.
- `docu/`: ARCHITECTURE.md plus PlantUML diagrams.

## Conventions

- Formatting: tabs, single quotes, semicolons, print width 150, trailing commas es5 (`.prettierrc.json`).
- Tests: mocha `describe`/`it` imported from `'mocha'`, `expect` from chai, sinon for fakes. The vscode mock is minimal: if code under test uses a new VS Code API, add a fake for it to the mock.
- `Helper`, `Persist` and `PathHelper` are abstract classes with only static state, and `TaskManager` is a singleton. State carries over between tests, so reset it explicitly.
- Errors: catch and report with `Helper.reportError({ message: Helper.getErrorMessage(error) })` (goes to the "Taskmarks Errors" output channel).
- Mark line numbers are 0-based (taken from `selection.active.line`).
- Stored file paths are workspace-relative with a leading separator (e.g. `\src\a.ts`). On load, `normalizeFilePaths` converts them to the current OS separator.
- User-visible changes go into `CHANGELOG.md` (Keep a Changelog style, issue links like `[#45](...)`).

## Persistence rules that are easy to break

- File format version is `CURRENT_VERSION` in `src/core/migration.ts` (currently 2). Every old format must stay loadable. To change the format, bump the version, extend `upgradeTask` and the types in `src/types.ts`, add a migration test with a file in the previous format, and update the versions table in ARCHITECTURE.md.
- A file from a newer version is loaded **read-only** (`Persist._readOnly`) and is never saved over.
- Before an upgrade, or before replacing an invalid file, the old file is copied to `taskmarks.json.<suffix>.bak`. An existing backup is never overwritten.
- No `taskmarks.json` is created while the active task is `default` and has no marks (so the extension doesn't create files in projects that don't use it).
- `saveTaskmarksJson` only writes when the serialized JSON has changed.
- Mark line tracking only runs for the document in the active editor, and it works from each change's range and inserted text (`mapMarkLines`), not from line-count differences.

## Repo notes

- `.vscode/taskmarks.json` and `src/taskmarks.test.txt` are used for manual testing in the Extension Development Host. They often show up as modified, so don't commit them unless asked.
- The `vscode-jest-tests` launch config in `.vscode/launch.json` is left over from an older setup. Jest isn't used anymore.
