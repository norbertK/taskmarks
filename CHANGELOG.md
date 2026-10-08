# Changelog

All notable changes to the "taskmarks" extension will be documented in this file.

## [Unreleased]

### Added
- Command "Taskmarks: Edit Label of Bookmark at Current Position": change, add or remove the label of an existing bookmark. Works whether or not `taskmarks.enableLabel` is on

## [1.1.0] - 2026-10-07

### Fixed
- Next / previous bookmark across files now continues from the file in the active editor. Before, it continued from the file that was added to the task last, so it could jump to the wrong file or back to the start of the current one
- "Select Bookmark from List" showed the old line number and line text of a bookmark that had moved or whose line was edited since the list was first opened, and jumped to the old line. A bookmark whose file could not be read once stayed missing from the list
- "Delete Task" on the active `default` task did not remove it: its bookmarks stayed visible, but the task was no longer saved, so bookmarks set afterwards were lost with the next reload. It is now replaced by a new, empty `default` task
- "Rename Task" to the name of another task created two tasks with the same name, of which only one could be selected. Such a rename is now refused with a message
- A renamed task was only written to taskmarks.json with the next save
- taskmarks.json is loaded again when it changes on disk (git pull, checkout, edited by hand). Before, the changes were ignored and overwritten with the next save
- A team on Windows and macOS / Linux no longer rewrites all paths in taskmarks.json with every save: the file keeps the path separator it has, a new file is written with `/`
- `taskmarks.useGlobalTaskmarksJson` kept the bookmarks of all workspaces in one file, although the paths in it are relative to the workspace. Each workspace now has its own file in VS Code's storage; the content of the old file is taken over when a workspace is opened for the first time
- Bookmarks of a file in another task than the active one stayed on their old lines when the file was edited. Edits now move the bookmarks of the file in every task
- Bookmarks are also moved when a file is changed that is not in the active editor (rename or replace across files, format on save, a second editor group)
- With a split editor, only the active editor showed the bookmarks, and an editor that was left kept showing old ones (after a task switch, for example). All visible editors now show the bookmarks of the active task
- With `taskmarks.enableLabel`, pressing Enter on the empty label box set no bookmark. It now sets a bookmark without label; Escape cancels
- A file that can't be opened when jumping to a bookmark is reported with a message
- Errors in "Select Task", "Rename Task", "Create new Task" and "Delete Task" are written to the "Taskmarks Errors" output
- Next / previous bookmark and "Select Bookmark from List" leave out files that don't exist on disk, instead of stopping at them or reporting an error
- Saving no longer removes the bookmarks of files that don't exist on disk. Before, the bookmarks a teammate set in a file that is missing in your checkout (another branch, not pulled yet) were deleted from the shared taskmarks.json with your next save
- "Paste Task from Clipboard": the pasted bookmarks show up in the open editor right away, a message confirms the paste, text that is not a task gets a plain "does not contain a Taskmarks task" message, and a task copied on a system with the other path separator (Windows / macOS, Linux) finds its files
- If taskmarks.json can't be written (locked, read-only), the error goes to the "Taskmarks Errors" output and the next save tries again
- A bookmark in a file outside the workspace folder was lost with the next reload. Such a bookmark is no longer set; a message says why
- Removing the last bookmark of a file and setting one again no longer moves the file to the end of its task in taskmarks.json
- Paste from clipboard takes over the label of a bookmark if the bookmark on that line has none yet. Before, the label was dropped

### Changed
- "Select Bookmark from List" shows line numbers as the editor does (counted from 1, before from 0) and the line text without its indentation; an empty line is shown as `(empty line)`
- If taskmarks.json can't be read after it was changed outside of VS Code (e.g. conflict markers after a pull), the bookmarks stay as they are and nothing is saved until the file can be read again; the warning offers to overwrite the file (a backup is written first)
- A taskmarks.json without a `default` task no longer gets an empty one added
- "Delete Task" asks for confirmation if the task has bookmarks
- A task only keeps files that have bookmarks, in the order they got their first one. Before, every opened file was added, so the order in taskmarks.json and for next / previous bookmark depended on the order the files were opened in
- From a file without bookmarks, next / previous bookmark goes to the first / last file of the task
- Internal structure: the commands moved from `Helper` to `Commands`, the tracking of edits to `MarkTracker`, error formatting to `core/errors.ts`. `TaskManager`, `Task`, `File` and `Mark` no longer depend on the VS Code API
- Removed the `Ring` class; a task keeps its files in a plain array and the file to jump to is computed in `core/navigation.ts`

## [1.0.1] - 2026-09-30

First release since 0.9.6 (1.0.0 was not published).

### Fixed
- "Select Bookmark from List" could fail because a bookmark's list entry was read before it was ready
- [#45](https://github.com/norbertK/taskmarks/issues/45) - marks are tracked from the actual edit (range + inserted text) instead of the difference in line count. Marks on deleted lines are removed, marks below move correctly, also after several edits in a row and with multiple cursors.
- Pressing Delete at the end of a marked line (joining lines) keeps the mark
- Pressing Enter at the start of a marked line moves the mark down with its text
- An invalid taskmarks.json no longer stops the extension from starting

### Added
- Keyboard shortcuts: `Ctrl+Alt+M` toggle bookmark, `Ctrl+Alt+N` / `Ctrl+Alt+P` next / previous bookmark, `Ctrl+Alt+T` select task (`Cmd` on macOS)
- Faster start: the extension activates as soon as the workspace contains `.vscode/taskmarks.json`
- Undo (Ctrl+Z) of an edit that removed marks brings the marks back, with their labels. Works for the last 20 such edits per file, as long as no other edit above them happened in between
- Input boxes for "Create new Task", "Rename Task" and bookmark labels now say what to enter; "Rename Task" starts with the old name filled in
- taskmarks.json now has a `"version": 2` field
- All older taskmarks.json formats (2018 `tasks/files/marks`, 0.8.17 `lineNumbers`, 0.8.21 `persistTasks` + `lineNumbers`, 0.8.23 – 1.0.0 `persistMarks`) are upgraded on load instead of being discarded. The old file is kept as `taskmarks.json.v<old version>.bak`
- An unreadable taskmarks.json is kept as `taskmarks.json.invalid.bak` before starting empty
- A taskmarks.json written by a newer Taskmarks version is loaded but never overwritten
- Paste from clipboard also accepts tasks copied by older versions
- Pure `core/` modules for testability: `navigation.ts`, `serialization.ts`, `paths.ts`, `lineAdjustment.ts`, `migration.ts`
- Technical architecture documentation (`docu/ARCHITECTURE.md`)
- README: demo GIF (first shot), getting started, keyboard shortcuts, settings, where the marks are stored

## [0.9.6] - 2023-11-27

ring and ring tests - some refactoring

## [0.9.5] - 2023-03-31

some cleanup

## [0.9.4] - 2023-03-31

fixed https://github.com/norbertK/taskmarks/issues/22 - do not write if equal

## [0.9.3] - 2023-03-28

setting taskmarks.useGlobalTaskmarksJson added - Use one central Taskmarks.json

## [0.9.2] - 2023-03-28

only save new taskmarks.json, if bookmarks in active task 'default'

## [0.9.1] - 2023-03-26

removed webpack - mocha instead of jest - new tests - moved tests - still tests missing

## [0.8.33] - 2022-04-26

fixed DecoratorHelper showLine(lineNumber) when lineNumber is NaN
https://github.com/norbertK/taskmarks/issues/20#issuecomment-1108790922

## [0.8.31] - 2022-04-25

aah, didn't think that one through

## [0.8.29] - 2022-04-24

label as label (searchable)

## [0.8.27] - 2022-04-22

detect and remove invalid taskmarks.json

## [0.8.25] - 2022-04-22

fixed error `Cannot read properties of undefined (reading 'length')`

## [0.8.23] - 2022-04-21

setting taskmarks.enableLabel added - enter your own text for a mark

## [0.8.21] - 2022-04-20

- **Taskmarks: Select Bookmark From List** working again
- **Taskmarks: Copy Active Task to Clipboard** working again
- **Taskmarks: Paste Clipboard to Task** working again
- fixed errors
- added more tests
- clipboard working again
- always sort line numbers
- rename Tasks:
- **Taskmarks: Rename Task**
- new output channel Taskmarks Errors

## [0.8.19] - 2022-04-16

.try to fix errors
still loosing tasks
taskmarks.createTask - default ok - second ok - third deletes entries in default

- removed **Taskmarks: Select Bookmark From List** List all bookmarks in the current task
- (did that ever work?)

## [0.8.17] - 2022-04-05

- pre release version published
- old taskmarks.json will be 'converted'

## [0.8.13] - 2022-03-01

- still trying to publish pre release version
- removed all tests
- from scratch with webpack
- some new bugs?

## [0.8.11] - 2022-03-31

- trying to publish pre release version

## [0.8.9] - 2022-03-29

- trying to publish pre release version

## [0.8.7] - 2022-03-28

- trying to publish pre release version

## [0.8.5-beta.3] - 2022-03-23

- renamed File.get marks() to lineNumbers()
- renamed File.get marksForPersist() to lineNumbersForPersist()
- renamed File.get toggleTask() to toggleTaskMark()

- more test
- moved Ideas from CHANGELOG to README

## [0.8.5-beta.2] - 2022-03-16

- temporary removed clipboard
- added test for TaskManager

## [0.8.5-beta.1] - 2022-03-14

- integrated fork ( https://github.com/bheadwhite/taskmarks )

## [0.8.0] - 2022-01-29

## forked

- cleaned up types
- cleaned up problems

## [0.7.1] - 2021-03-09

### update to newest libs, some tests, change from yarn to npm

## [0.6.1] - 2018-04-23

### show active task, delete task, some fixes

- show active task in taskbar
- possibility to delete task
- 'switch Task' and 'next' now always work
- start 'Select Active Task' on Active Task, not always on default

## [0.5.4] - 2018-04-06

### some cleanup - removed DebLog, fixed problem with no mark in file

## [0.5.3] - 2018-04-01

### some cleanup - some new ideas

## [0.5.2] - 2018-04-01

### Copy to Clipboard and Paste from Clipboard works now

## [0.5.1] - 2018-03-26

### Copy to Clipboard and Paste from Clipboard added

## [0.4.6] - 2018-03-25

### Upgraded to newest vscode, but then found the error in my code :-(

(vscode 1.19.0 to 1.21.0)
toggle did not work - fixed

## [0.4.4] - 2018-03-25

### looking for error

## [0.4.3] - 2018-03-25

### First Version Released to Marketplace

## [0.4.1] - 2018-03-25

### First Version 'Good Enough' :-)

## [0.3.1] - 2018-03-24

### Fixed

- thrown away lot of code and wrote new
- make taskmarks (somewhat) sticky - still needs some work
- most of the time, the promises work ;-(

## [0.2.2] - 2018-03-10

### Added

- new ways to navigate (list) works, but broke bookmark display (refresh)

## [0.2.1] - 2018-03-10

### Added

- jump to bookmarks in next / previous file

## [0.1.7] - 2018-02-04

### Added

- previous bookmark (in file)

## [0.1.6] - 2018-02-03

### Added

- First very unfinished version on GitHub
- Add and select Task
- Toggle bookmark, next bookmark

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.
