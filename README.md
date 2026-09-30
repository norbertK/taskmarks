# Taskmarks

VSCode Extension - Persist bookmarks for different tasks.

On big projects, coming back to a topic that I did not touch for some time, I often need time to 'find the right places'. Taskmarks makes it possible to keep those old bookmarks, and go back to them, whenever I need them.

New topic - just add a new Task (Task == collection of bookmarks, belonging to a topic) and keep them forever.

Or copy a Task and share it with your co-workers. Or create a new one, to tell him or her: 'Please look here and here. Do we have a problem? / Could you please ...'

## Intro

- Integrated fork from Brent Whitehead (https://github.com/bheadwhite/taskmarks)

### Available commands

- **Taskmarks: Create new Task** Create new Task (enter new Taskname)
- **Taskmarks: Delete Task** Delete Task (from Tasklist)
- **Taskmarks: Rename Task** Rename Task (from Tasklist)
- **Taskmarks: Copy Active Task to Clipboard** Copy Active Task to Clipboard
- **Taskmarks: Paste Clipboard to Task** Paste Clipboard to Task with same name
- **Taskmarks: Select Active Task** Select Active Task (from List)
- **Taskmarks: Toggle** Toggle Bookmark at Current Position
- **Taskmarks: Find next Bookmark** Move the cursor to the next bookmark
- **Taskmarks: Find previous Bookmark** Move the cursor to the previous bookmark
- **Taskmarks: Select Bookmark from List** show Bookmarks and jump to Selected

## Done

- Version 1.0.0
- Paste (from clipboard) to active task
- Pure `core/` modules for testability (navigation, serialization, paths, lineAdjustment)
- Tests for core modules and data structures (181 tests)

## Ideas / Future

- New command: remove unused (empty) Tasks
- Disable taskbar display in settings
- Make demo video
- Better shortcuts that work outside edit mode
- Add debug points to task
- Comments on tasks (stored in taskmarks.json)

## Requirements

## Extension Settings

## Known Issues

None currently open.

### Fixed Issues

- [#45](https://github.com/norbertK/taskmarks/issues/45) - markers at end now properly removed when lines deleted (1.0.0)
- [#22](https://github.com/norbertK/taskmarks/issues/22) - markers now move when lines inserted/deleted (0.9.4, tests added in 1.0.0)

## Release Notes

See [CHANGELOG.md](https://github.com/norbertK/taskmarks/blob/master/CHANGELOG.md)
