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

## Features / Command / Keyboard / ToDos / Ideas

- Version 1.0.0 ???
- paste (from clipboard) to active task
- one central taskmarks.json (setting) - local trumps central 
- remove all vscode references from tests (or better mock them) (UnhandledPromiseRejectionWarning: Unhandled promise rejection. in tests)
- new command : remove unused (empty) Tasks
- Tests
- perhaps? move all vscode stuff to helpers? should make testing easier
- disable taskbar display (and perhaps other things) in settings
- make little demo, how to work with taskmarks
- find better shortcuts and make them work outside the edit mode (eg 'goto next' or 'Select Active Task' should work always)
- add debug points to task (toggle, switch all on or off)
- perhaps? be able to leave comments on tasks - for starters, just keep them in taskmarks.json  
- version taskmarks.json? import old?

## Done (still testing)

(0.9.2) - do not write <span style="text-decoration: underline">new</span> empty taskmarks.json  

## Requirements

## Extension Settings

## Known Issues

## Release Notes

See [CHANGELOG.md](https://github.com/norbertK/taskmarks/blob/master/CHANGELOG.md)


