# Changelog

All notable changes to the "taskmarks" extension will be documented in this file.

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
