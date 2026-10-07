# Taskmarks Architecture

Technical overview of the VS Code extension for persistent, task-based bookmarks.

## File Structure

The extension is organized into three layers:

```
src/
├── extension.ts          # Entry point, command registration
├── Helper.ts             # VS Code event coordination
├── DecoratorHelper.ts    # Editor gutter icons
│
├── TaskManager.ts        # Singleton task orchestrator
│
├── Task.ts               # Task with array of files
├── File.ts               # File with array of marks
├── Mark.ts               # Single bookmark (line + label)
│
├── Persist.ts            # JSON save/load operations
├── PathHelper.ts         # Path manipulation, file I/O
├── types.ts              # TypeScript interfaces
│
└── core/                 # Pure modules (no VS Code deps)
    ├── navigation.ts     # Mark navigation logic
    ├── serialization.ts  # JSON format conversion
    ├── migration.ts      # taskmarks.json versions + upgrade
    ├── lineAdjustment.ts # Move/remove marks on edits
    └── paths.ts          # Path utilities
```

**Layers:**
- **VS Code Integration**: `extension.ts`, `Helper.ts`, `DecoratorHelper.ts`
- **Business Logic**: `TaskManager.ts`
- **Data Structures**: `Task.ts`, `File.ts`, `Mark.ts` (`File` and `Mark` import neither `vscode` nor the helpers; `Task` only uses `PathHelper` to make paths workspace-relative)
- **Persistence**: `Persist.ts`, `PathHelper.ts`
- **Pure Core**: `core/*.ts` (testable without VS Code)

---

## Class Hierarchy

```mermaid
classDiagram
    TaskManager "1" --> "*" Task : _allTasks
    Task "1" --> "*" File : _files
    Task "1" --> "0..1" File : _activeFile
    File "1" --> "*" Mark : _marks
    
    Helper ..> TaskManager : uses
    Helper ..> DecoratorHelper : uses
    Helper ..> Persist : uses
    
    Persist ..> TaskManager : reads/writes
    Persist ..> PathHelper : uses
    
    class TaskManager {
        -_instance: TaskManager
        -_activeTask: Task
        -_allTasks: Task[]
        -_statusBarItem: StatusBarItem
        +instance: TaskManager
        +useActiveTask(name): Task
        +nextMark(line): void
        +previousMark(line): void
    }
    
    class Task {
        -_name: string
        -_files: File[]
        -_activeFile: File
        +toggle(filename, line, label): void
        +use(path): File
        +syncFile(file): void
        +lineHasMark(filename, line): boolean
    }
    
    class File {
        -_filepath: string
        -_marks: Mark[]
        +toggleTaskMark(mark): void
        +hasMark(line): boolean
        +lineNumbers: number[]
    }
    
    class Mark {
        -_lineNumber: number
        -_label: string
    }
```

---

## Data Flow: Toggle Bookmark

When a user presses `Ctrl+Alt+M`:

```mermaid
sequenceDiagram
    participant VSCode as VS Code
    participant Ext as extension.ts
    participant H as Helper
    participant TM as TaskManager
    participant T as Task
    participant F as File
    participant P as Persist
    participant DH as DecoratorHelper

    VSCode->>Ext: toggleMark command
    Ext->>H: toggleMark()
    H->>TM: activeTask
    TM-->>H: Task
    H->>T: toggle(filename, line, label)
    T->>F: toggleTaskMark(mark)
    T->>T: syncFile(file)
    F->>F: splice or push Mark
    H->>P: saveTaskmarksJson()
    P->>P: JSON.stringify()
    P->>P: writeFileSync()
    H->>DH: refresh(editor, lineNumbers)
    DH->>VSCode: setDecorations()
```

---

## Data Flow: Line Change Tracking

When document content changes, mark positions are adjusted from the edit itself. VS Code reports each change as the replaced range (in pre-edit coordinates) plus the inserted text, so no line count has to be remembered between events.

```mermaid
flowchart LR
    A[onDidChangeTextDocument] --> B[convert contentChanges to TextChange]
    B --> C[mapMarkLines: apply changes bottom-up]
    C --> D{any mark moved or removed?}
    D -->|No| Z[Done]
    D -->|Yes| E[set new lineNumbers, File.removeMarks]
    E --> F[Helper.refresh → DecoratorHelper]
    F --> G[Persist.saveTaskmarksJson]
```

**Code location**: `Helper.initChangeHandler()` calls `mapMarkLines()` from `core/lineAdjustment.ts`.

Rules for one change (`mapLineThroughChange`):

| Marked line | Result |
|-------------|--------|
| above the change | unchanged |
| below the change | shifted by (inserted newlines − replaced lines) |
| strictly inside a multi-line range | removed |
| first line of the range | kept, unless deleted from column 0 to column 0 of a later line |
| last line of a multi-line range | kept (moved) only if the edit left it starting a line of its own, else removed (joined) |
| Enter at column 0 of the marked line | moves down with the text |

Marks that land outside the document or on a line another mark already has are removed. Removal is by `Mark` object, not by line number.

**Undo:** when a single-change edit removes marks, `Helper` keeps a `MarkRemoval` (start position, replaced and inserted line counts, the removed marks) per file, at most 20. On a change with `reason === Undo`, `findUndoneRemoval()` looks for a removal the undo exactly reverses (same start position, line counts swapped) and the marks are added back at their old lines. Redo needs no handling: it is the same delete again. The list lives in memory only.

---

## Navigation Across Files

`Task.files` is a plain `File[]` and holds only files that have marks, in the order they got their first mark. `Task.syncFile(file)` keeps it that way: it adds a file with its first mark and removes it with its last. `toggle()` and `mergeFilesWithPersistFiles()` call it themselves; code that changes a file's marks directly (the change handler in `Helper`) has to call it.

`Task.activeFile` is the file in the active editor, set by `use()` on every editor change. While it has no marks it is not part of `files`. When it gets a mark, the same `File` object is added, so the editor and the task never work on two objects for one path.

There is no stored cursor: the position is always derived from `activeFile`. If the active file has no marks, navigation starts at the first (next) or last (previous) file of the task.

**Navigation logic** (in `TaskManager`):
1. `findNextMark()` looks for the next marked line in the active file
2. If none found → `nextDocument()` calls `findNextFileWithMarks(files, indexOfActiveFile)` from `core/navigation.ts`
3. That walks the array once from the file after the active one, wrapping around, skips files without marks, and checks the active file last (so a task with marks in one file wraps to that file's first mark)
4. The result is opened at its first mark; if no file has marks, nothing happens

`previousMark()` / `previousDocument()` mirror this with `findPreviousMark()` / `findPreviousFileWithMarks()` and open the previous file at its last mark.

---

## Persistence Format

Data is stored in `.vscode/taskmarks.json`:

```typescript
interface IPersistTaskManager {
    version?: number;        // 2 since 1.0.1, missing in older files
    activeTaskName: string;
    persistTasks: IPersistTask[];
}

interface IPersistTask {
    name: string;
    persistFiles: IPersistFile[];
}

interface IPersistFile {
    filepath: string;        // relative to workspace
    persistMarks: IPersistMark[];
}

interface IPersistMark {
    lineNumber: number;
    label: string;
}
```

**Example:**
```json
{
  "version": 2,
  "activeTaskName": "feature-auth",
  "persistTasks": [
    {
      "name": "feature-auth",
      "persistFiles": [
        {
          "filepath": "\\src\\auth\\login.ts",
          "persistMarks": [
            { "lineNumber": 42, "label": "TODO: validate token" },
            { "lineNumber": 87, "label": "" }
          ]
        }
      ]
    }
  ]
}
```

### Versions and upgrade

`core/migration.ts` reads every format the extension ever wrote and converts it to the current one:

| Version | Written by | Shape |
|---------|-----------|-------|
| 0 | 2018 – 0.8.13 | `tasks[].files[].marks: number[]` |
| 0 | 0.8.17 | `tasks[].files[].lineNumbers: number[]` |
| 0 | 0.8.21 | `persistTasks[].persistFiles[].lineNumbers: number[]` |
| 1 | 0.8.23 – 1.0.0 | `persistTasks[].persistFiles[].persistMarks: {lineNumber, label}[]` |
| 2 | 1.0.1 | version 1 + `"version": 2` |

What `Persist.initAndLoad` does with the result of `loadTaskmarksJson()`:

```mermaid
flowchart TD
    A[loadTaskmarksJson] --> B{status}
    B -->|invalid| C[backup taskmarks.json.invalid.bak<br/>warn, start with 'default']
    B -->|newer| D[load known fields<br/>warn, read-only: never save]
    B -->|ok, older version| E[backup taskmarks.json.v&lt;n&gt;.bak<br/>load; next save writes version 2]
    B -->|ok, current| F[load]
```

To add a version 3 (e.g. breakpoints per task): raise `CURRENT_VERSION`, add the new optional fields to the types and to `upgradeTask`, and add a test with a version 2 file.

---

## Initialization Sequence

```mermaid
sequenceDiagram
    participant VSCode
    participant Ext as extension.ts
    participant H as Helper
    participant PH as PathHelper
    participant TM as TaskManager
    participant P as Persist
    participant DH as DecoratorHelper

    VSCode->>Ext: activate(context)
    Ext->>H: init(context, outputChannel)
    H->>PH: basePath = workspace.uri.fsPath
    H->>TM: TaskManager.instance
    TM->>TM: new TaskManager()
    H->>P: initAndLoad(taskManager, context)
    P->>PH: getTaskmarksJson()
    PH-->>P: JSON string
    P->>P: loadTaskmarksJson() (upgrade old versions)
    P->>P: normalizeFilePaths()
    P->>TM: addTask() for each
    H->>DH: initDecorator(context)
    H->>H: initActiveEditorChangeHandler()
    H->>H: initSaveHandler()
    H->>H: initChangeHandler()
    Ext->>VSCode: register all commands
```

---

## Available Commands

| Command | Keybinding | Handler |
|---------|------------|---------|
| `toggleMark` | `Ctrl+Alt+M` | `Helper.toggleMark()` |
| `nextMark` | `Ctrl+Alt+N` | `Helper.nextMark()` |
| `previousMark` | `Ctrl+Alt+P` | `Helper.previousMark()` |
| `selectTask` | `Ctrl+Alt+T` | `Helper.selectTask()` |
| `createTask` | - | `Helper.createTask()` |
| `renameTask` | - | `Helper.renameTask()` |
| `deleteTask` | - | `Helper.deleteTask()` |
| `selectMarkFromList` | - | `Helper.selectMarkFromList()` |
| `copyToClipboard` | - | `Persist.copyToClipboard()` |
| `pasteFromClipboard` | - | `Persist.pasteFromClipboard()` |

---

## Pure Core Modules

The `core/` directory contains pure functions with no VS Code dependencies, enabling easier testing.

### core/navigation.ts

```typescript
findNextMark(currentLine: number, lineNumbers: number[]): number | undefined
findPreviousMark(currentLine: number, lineNumbers: number[]): number | undefined
findNextFileWithMarks(files, currentIndex): { filepath, lineNumber } | undefined
findPreviousFileWithMarks(files, currentIndex): { filepath, lineNumber } | undefined
```

### core/serialization.ts

```typescript
taskToPersistTask(task, fileExistsCheck): IPersistTask
persistTaskToTask(persistTask): SerializableTask
normalizeFilePaths(persistTaskManager, fromChar, toChar): IPersistTaskManager
```

### core/migration.ts

```typescript
CURRENT_VERSION = 2
loadTaskmarksJson(json): { status: 'ok' | 'newer', data, fromVersion } | { status: 'invalid', reason }
upgradeTask(value): IPersistTask | undefined   // also used for clipboard paste
detectVersion(raw): number
```

### core/lineAdjustment.ts

```typescript
mapLineThroughChange(line, change: TextChange): number | undefined
mapMarkLines(lines, changes: TextChange[], newLineCount): (number | undefined)[]
```

### core/paths.ts

```typescript
detectPathCharacters(path): { active: string, inactive: string }
getFullPath(basePath, filepath): string
reducePath(basePath, filepath): string
isInsideBasePath(basePath, filepath): boolean   // marks are only set in such files
normalizePath(filepath, fromChar, toChar): string
```

---

## Key Design Decisions

1. **Singleton TaskManager**: Single source of truth for all task state
2. **No navigation cursor**: prev/next across files is computed from the active file, so it cannot drift from the editor
3. **Relative paths**: Stored paths are workspace-relative for portability. A file outside the (first) workspace folder can't be stored that way, so `Helper.toggleMark()` refuses to set a mark there
4. **Auto-save on document save**: Marks persist automatically
5. **Line tracking**: Marks adjust when lines are inserted/deleted above them
6. **Pure core modules**: Business logic separated from VS Code APIs for testability
7. **UI stays in `Helper`**: the entries of "Select Bookmark from List" are built in `Helper.getMarkQuickPickItems()`, fresh on every call (one `openTextDocument` per file). Each entry carries its `Mark`, so the jump uses the mark's current line instead of text parsed back from the entry
