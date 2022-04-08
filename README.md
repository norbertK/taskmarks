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
- **Taskmarks: Select Bookmark From List** List all bookmarks in the current task
- **Taskmarks: Copy Active Task to Clipboard** Copy Active Task to Clipboard
- **Taskmarks: Paste Clipboard to Task** Paste Clipboard to Task with same name
- **Taskmarks: Select Active Task** Select Active Task (from List)
- **Taskmarks: Toggle** Toggle Bookmark at Current Position
- **Taskmarks: Find next Bookmark** Move the cursor to the next bookmark
- **Taskmarks: Find previous Bookmark** Move the cursor to the previous bookmark

## Features / Command / Keyboard / ToDos / Ideas

- new command : remove unused (empty) Tasks
- rename Tasks
- Tests
- perhaps? move all vscode stuff to helpers? should make testing easier
- disable taskbar display (and perhaps other things) in settings
- sort marks
- always sort line numbers
- make little demo, how to work with taskmarks
- find better shortcuts and make them work outside the edit mode (eg 'goto next' or 'Select Active Task' should work always)
- add debug points to task (toggle, switch all on or off)
- perhaps? be able to leave comments on tasks - for starters, just keep them in taskmarks.json
- enable Logfile in settings - problems? - enable log and send it to me!

## Requirements

## Extension Settings

## Known Issues

- loosing tasks
- insert from clipboard (only first task inserted)

## Release Notes

See [CHANGELOG.md](https://github.com/norbertK/taskmarks/blob/master/CHANGELOG.md)
