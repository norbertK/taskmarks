# Taskmarks

VSCode Extension - Persist bookmarks for different tasks.

On big projects, coming back to a topic that I did not touch for some time, I often need time to 'find the right places'. Taskmarks makes it possible to keep those old bookmarks, and go back to them, whenever I need them.

New topic - just add a new Task (Task == collection of bookmarks, belonging to a topic) and keep them forever.

Or copy a Task and share it with your co-workers. Or create a new one, to tell him or her: 'Please look here and here. Do we have a problem? / Could you please ...'

![Taskmarks demo](images/demo.gif)

_A first shot of a demo - a better one will follow._

## Getting started

1. Put the cursor on a line and press `Ctrl+Alt+M` - a bookmark appears next to the line number. Your marks belong to the task shown in the status bar (`TaskMarks: default` at the start).
2. Set more marks, in as many files as you like. `Ctrl+Alt+N` / `Ctrl+Alt+P` jump to the next / previous mark, also across files.
3. Starting on something else? Run **Taskmarks: Create new Task** - the new task starts empty, the marks of the old one are kept.
4. `Ctrl+Alt+T` switches between tasks, and the marks of the selected task come back.

Marks move with the code when you insert or delete lines. If the marked line itself is deleted, the mark goes too - and comes back with Undo.

## Commands and keyboard shortcuts

On macOS use `Cmd` instead of `Ctrl`.

| Command | Shortcut | What it does |
|---------|----------|--------------|
| **Taskmarks: Toggle Bookmark at Current Position** | `Ctrl+Alt+M` | Set or remove a mark on the current line |
| **Taskmarks: Find next Bookmark** | `Ctrl+Alt+N` | Jump to the next mark, continuing in the next file |
| **Taskmarks: Find previous Bookmark** | `Ctrl+Alt+P` | Jump to the previous mark, continuing in the previous file |
| **Taskmarks: Select Active Task** | `Ctrl+Alt+T` | Switch to another task |
| **Taskmarks: Select Bookmark from List** | | List all marks of the active task and jump to the selected one |
| **Taskmarks: Create new Task** | | Create a new, empty task and make it active |
| **Taskmarks: Rename Task** | | Rename a task (from the task list) |
| **Taskmarks: Delete Task** | | Delete a task and its marks (from the task list) |
| **Taskmarks: Copy Active Task to Clipboard** | | Copy the active task, e.g. to send it to a co-worker |
| **Taskmarks: Paste Task from Clipboard** | | Add a copied task; if a task with the same name exists, the marks are merged into it |

## Where the marks are stored

In `.vscode/taskmarks.json` in your workspace. Commit it if your team should share the tasks, or add it to `.gitignore` if they are yours only. When Taskmarks upgrades an older file, it keeps the old one as `taskmarks.json.v<n>.bak`.

## Extension Settings

- `taskmarks.enableLabel` (default `false`) - ask for a label when setting a mark. The label is shown in **Select Bookmark from List** instead of the text of the line.
- `taskmarks.useGlobalTaskmarksJson` (default `false`) - keep the marks in one central `taskmarks.json` (in VS Code's storage for this extension) instead of `.vscode/taskmarks.json`. A local `.vscode/taskmarks.json` that already exists is still used.

## Credits

- Integrated fork from Brent Whitehead (https://github.com/bheadwhite/taskmarks)

## Done

- Version 1.0.0
- Paste (from clipboard) to active task
- Pure `core/` modules for testability (navigation, serialization, paths, lineAdjustment, migration)
- Versioned taskmarks.json - all older formats (back to 2018) are upgraded on load, with a backup of the old file

## Ideas / Future

- only load ? useful ? tasks
- remove all vscode references from tests (or better mock them) (UnhandledPromiseRejectionWarning: Unhandled promise rejection. in tests)
- more tests (Helper, Persist and TaskManager navigation still mostly untested)
- New command: remove unused (empty) Tasks
- Disable taskbar display in settings
- Better demo GIF (shorter, re-recorded)
- Better shortcuts that work outside edit mode (eg 'goto next' or 'Select Active Task' should work always)
- Add debug points (breakpoints) to task - would be taskmarks.json version 3
- Comments on tasks (stored in taskmarks.json)

## Known Issues

None currently open.

### Fixed Issues

- [#45](https://github.com/norbertK/taskmarks/issues/45) - if too many lines are deleted, marker at end can not be removed (1.0.1)
- [#22](https://github.com/norbertK/taskmarks/issues/22) - markers now move when lines inserted/deleted (0.9.4, tests added in 1.0.1)

## Release Notes

See [CHANGELOG.md](https://github.com/norbertK/taskmarks/blob/master/CHANGELOG.md)
